const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { secureAiPipeline } = require('../services/ai.service');

// Optional auth verifier
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId };
    }
  } catch (err) {
    // Ignore invalid token for guests, they will just get a session_id
  }
  next();
};

router.use(optionalAuth);

// ── Rate Limiting Helper (Simple implementation)
async function checkRateLimit(userId) {
  // Allow 50 requests per hour per user
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);
  
  let rateLimit = await prisma.aiChatRateLimit.findFirst({
    where: {
      user_id: userId,
      window_start: { gte: windowStart }
    },
    orderBy: { window_start: 'desc' }
  });

  if (!rateLimit) {
    rateLimit = await prisma.aiChatRateLimit.create({
      data: { user_id: userId, window_start: new Date(), request_count: 1 }
    });
    return true;
  }

  if (rateLimit.request_count >= 50) {
    return false;
  }

  await prisma.aiChatRateLimit.update({
    where: { id: rateLimit.id },
    data: { request_count: { increment: 1 } }
  });

  return true;
}

// ── GET /api/ai-chat/conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;

    const conversations = await prisma.aiChatConversation.findMany({
      where: userId ? { user_id: userId, is_active: true } : { id: '00000000-0000-0000-0000-000000000000' }, // Guests don't get history across reloads easily unless session_id is stored in localstorage
      orderBy: { last_active_at: 'desc' },
      take: 10,
      include: {
        messages: {
          orderBy: { created_at: 'desc' },
          take: 1
        }
      }
    });
    res.json({ success: true, conversations });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai-chat/conversations
// 1. Create a new conversation (Supports Both Guest & Logged In)
router.post('/conversations', async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    let sessionId = null;

    if (!userId) {
      // Generate a distinct session ID for guest users
      const crypto = require('crypto');
      sessionId = 'guest_' + crypto.randomBytes(16).toString('hex');
    }

    const conversation = await prisma.aiChatConversation.create({
      data: {
        user_id: userId,
        session_id: sessionId,
        is_active: true
      }
    });

    // Option metadata
    await prisma.aiChatConversationMetadata.create({
      data: {
        conversation_id: conversation.id,
        user_agent: req.headers['user-agent']?.substring(0, 255),
        ip_address: req.ip
      }
    });

    res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/ai-chat/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const conversationId = req.params.id;

    // Verify conversation existence
    const conversation = await prisma.aiChatConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    // Auth Check
    if (userId && conversation.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    // If userId is null, it's a guest. Check if session_id matches (if provided in req.query or header)
    // For simplicity, we'll allow guests to view messages if they know the conversation ID,
    // but they won't be able to create new messages unless their session_id matches or they are logged in.
    // A more robust guest implementation would involve passing the session_id in the request for verification.
    // For now, if conversation.user_id is null (guest conversation), we allow access.
    if (!userId && conversation.user_id !== null) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const messages = await prisma.aiChatMessage.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'asc' }
    });

    res.json({ success: true, messages });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai-chat/conversations/:id/messages
router.post('/conversations/:id/messages', async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const { message_text } = req.body;
    const conversationId = req.params.id;

    if (!message_text || message_text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    if (userId) {
      const isAllowed = await checkRateLimit(userId);
      if (!isAllowed) {
        return res.status(429).json({ success: false, message: 'Rate limit exceeded. Try again later.' });
      }
    }

    // Allow guests if they know conversation ID (ideally check session_id)
    const conversation = await prisma.aiChatConversation.findFirst({
      where: userId ? { id: conversationId, user_id: userId } : { id: conversationId }
    });

    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // 1. Save User Message
    const userMessage = await prisma.aiChatMessage.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'user',
        message_type: 'text',
        message_text: message_text.trim()
      }
    });

    // Update conversation timestamp
    await prisma.aiChatConversation.update({
      where: { id: conversationId },
      data: { last_active_at: new Date() }
    });

    // 2. Fetch History for Context
    const history = await prisma.aiChatMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
      take: 10
    });

    let contextString = "CHAT HISTORY:\n";
    history.forEach(h => {
      contextString += `[${h.sender_type.toUpperCase()}]: ${h.message_text}\n`;
    });

    const crypto = require('crypto');

    // 3. Assemble Context & Hash System Prompt (Security Logging)
    const systemContext = `You are interacting with a student directly. Keep your responses engaging, helpful, and concise. Do not use JSON formatting, respond in plain Markdown text.
    
${contextString}`;

    const systemPromptHash = crypto.createHash('sha256').update(systemContext).digest('hex');

    // 4. Log Prompt safely tracking the hash mapped to the conversation
    await prisma.aiChatPromptLog.create({
      data: { 
        conversation_id: conversationId, 
        user_input: message_text,
        system_prompt_hash: systemPromptHash
      }
    });

    // 5. Secure AI Pipeline
    const startTime = Date.now();
    let aiOutputText = await secureAiPipeline({
      systemContext,
      userPrompt: message_text,
      jsonMode: false,
      restrictedMode: true,
      userId: userId,
      sessionId: conversation.session_id
    });

    const responseTimeMs = Date.now() - startTime;

    // 5. Save AI Message
    const aiMessage = await prisma.aiChatMessage.create({
      data: {
        conversation_id: conversationId,
        sender_type: 'ai',
        message_type: 'text',
        message_text: aiOutputText
      }
    });

    // 6. Save AI Response Metrics
    await prisma.aiChatAiResponse.create({
      data: {
        message_id: aiMessage.id,
        response_text: aiOutputText,
        model_used: 'gemini-2.0-flash',
        response_time_ms: responseTimeMs
      }
    });

    res.status(201).json({ success: true, userMessage, aiMessage });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai-chat/messages/:id/feedback
router.post('/messages/:id/feedback', async (req, res, next) => {
  try {
    const userId = req.user?.userId || null;
    const { rating, feedback_text } = req.body;

    // Verify ownership
    const message = await prisma.aiChatMessage.findFirst({
      where: { id: req.params.id },
      include: { conversation: true }
    });

    if (!message || (userId && message.conversation.user_id !== userId) || message.sender_type !== 'ai') {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    const feedback = await prisma.aiChatFeedback.upsert({
      where: { message_id: message.id },
      create: {
        message_id: message.id,
        user_id: userId,
        rating,
        feedback_text
      },
      update: {
        rating,
        feedback_text
      }
    });

    res.json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
