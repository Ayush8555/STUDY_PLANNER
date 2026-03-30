const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { secureAiPipeline } = require('../services/ai.service');

// Optional Auth
const jwt = require('jsonwebtoken');
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch(e) {}
  }
  next();
};

router.post('/', optionalAuth, async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    const userId = req.user?.userId || null;
    const sessionId = req.cookies?.session_id || req.headers['x-session-id'] || 'guest_' + crypto.randomBytes(8).toString('hex');
    
    if (!message || message.trim() === '') {
      return res.json({ success: false, response: "Please enter a message to continue." });
    }

    let activeConversationId = conversation_id;

    // 1. CREATE / GET CONVERSATION
    try {
      console.log("Inserting conversation...");
      if (!activeConversationId || activeConversationId === 'guest') {
        const newConvId = crypto.randomUUID();
        if (userId) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO ai_chat.conversations (id, user_id, session_id, started_at, last_active_at, is_active) VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW(), true)`,
            newConvId, userId, sessionId
          );
        } else {
          await prisma.$executeRawUnsafe(
            `INSERT INTO ai_chat.conversations (id, session_id, started_at, last_active_at, is_active) VALUES ($1::uuid, $2, NOW(), NOW(), true)`,
            newConvId, sessionId
          );
        }
        activeConversationId = newConvId;
      } else {
        await prisma.$executeRawUnsafe(`UPDATE ai_chat.conversations SET last_active_at = NOW() WHERE id = $1::uuid`, activeConversationId);
      }
    } catch (dbErr) { console.error("DB ERROR (Conversation):", dbErr); }

    // 3. STORE USER MESSAGE
    try {
      console.log("Inserting message...");
      if (activeConversationId && activeConversationId !== 'guest') {
        await prisma.$executeRawUnsafe(
          `INSERT INTO ai_chat.messages (conversation_id, sender_type, message_text, created_at) VALUES ($1::uuid, 'user', $2, NOW())`,
          activeConversationId, message
        );
      }
    } catch (dbErr) { console.error("DB ERROR (User Msg):", dbErr); }

    // 4. STORE PROMPT LOG
    try {
      if (activeConversationId && activeConversationId !== 'guest') {
        await prisma.$executeRawUnsafe(
          `INSERT INTO ai_chat.prompt_logs (conversation_id, user_input, system_prompt_hash, created_at) VALUES ($1::uuid, $2, $3, NOW())`,
          activeConversationId, message, "mentor-v1"
        );
      }
    } catch (dbErr) { console.error("DB ERROR (Prompt Log):", dbErr); }

    const startTime = Date.now();
    let aiResponse;
    try {
      aiResponse = await secureAiPipeline({
        systemContext: `As a senior educational mentor, your goal is to provide deep, high-quality, and structured answers.

BEHAVIORAL GUIDELINES:
- Give detailed, beginner-friendly explanations.
- Break answers into clear, actionable steps.
- Use examples where helpful.
- Avoid 1-line answers; provide medium-to-detailed responses.
- Do NOT become overly verbose.

CONTEXT AWARENESS:
- If asked about exams -> give strategy.
- If asked about the platform -> explain features clearly.
- If asked "how" -> give step-by-step instructions.
- If asked "what" -> give explanation + use case.

RESPONSE FORMAT:
Ensure your responses strictly follow this structure:
1. Short intro
2. Step-by-step explanation
3. Example (if applicable)
4. Optional tips`,
        userPrompt: message,
        jsonMode: false,
        restrictedMode: true,
        userId: userId,
        sessionId: sessionId
      });
    } catch (pipelineErr) {
      console.error("[Chat API] secureAiPipeline Error:", pipelineErr);
      aiResponse = null;
    }

    const safeAiResponse = aiResponse || "Something went wrong. Please try again.";
    console.log("AI response:", safeAiResponse.substring(0, 60) + "...");
    const responseTimeMs = Date.now() - startTime;

    // 5. STORE AI RESPONSE
    let aiMsgId = crypto.randomUUID();
    try {
      console.log("Inserting AI message...");
      if (activeConversationId && activeConversationId !== 'guest') {
        const rows = await prisma.$queryRawUnsafe(
          `INSERT INTO ai_chat.messages (id, conversation_id, sender_type, message_text, created_at) VALUES ($1::uuid, $2::uuid, 'ai', $3, NOW()) RETURNING id`,
          aiMsgId, activeConversationId, safeAiResponse
        );
        if (rows && rows.length > 0) aiMsgId = rows[0].id;
      }
    } catch (dbErr) { console.error("DB ERROR (AI Msg):", dbErr); }

    // 6. STORE AI METADATA
    try {
      if (activeConversationId && activeConversationId !== 'guest') {
         await prisma.$executeRawUnsafe(
            `INSERT INTO ai_chat.ai_responses (message_id, response_text, tokens_used, model_used, response_time_ms) VALUES ($1::uuid, $2, $3, $4, $5)`,
            aiMsgId, safeAiResponse, safeAiResponse.length, 'gemini-2.0-flash', responseTimeMs
         );
      }
    } catch (dbErr) { console.error("DB ERROR (AI Metadata):", dbErr); }

    return res.json({
      success: !!aiResponse,
      response: safeAiResponse,
      conversation_id: activeConversationId
    });

  } catch (err) {
    console.error("[Chat API] Top-level error:", err);
    return res.json({
      success: false,
      response: "Something went wrong. Please try again."
    });
  }
});

module.exports = router;
