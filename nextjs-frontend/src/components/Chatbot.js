'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/services/api';
import { ChatCircleDots, X, PaperPlaneRight, Robot, Sparkle, Copy, CheckCircle, Clock, StopCircle, Microphone, MicrophoneSlash } from '@phosphor-icons/react';
import useVoiceInput from '@/hooks/useVoiceInput';

const SUGGESTIONS = [
  "How to prepare for JEE?",
  "Create my study plan",
  "How does this platform work?"
];

// Formatting time HH:MM
const formatTime = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Memoized MessageBubble to optimize large streams
const MessageBubble = React.memo(({ msg, copyToClipboard, copiedId }) => {
  const isUser = msg.sender === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      {!isUser && (
         <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mr-3 mt-1 shadow-inner shadow-white/5 border border-white/5">
            <Robot size={14} weight="fill" className="text-violet-400" />
         </div>
      )}

      <div className={`max-w-[85%] flex flex-col gap-1.5`}>
        <div className={`group relative rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
          isUser 
            ? 'bg-gradient-to-br from-violet-600 to-[#8B5CF6] text-white font-medium rounded-br-sm shadow-violet-500/20' 
            : 'bg-[#111827] border border-white/5 text-gray-200 rounded-bl-sm drop-shadow-sm'
        }`}>
          {/* Output text dynamically streamed or loaded */}
          <div className="whitespace-pre-wrap">{msg?.text || ""}</div>
          
          {/* Copy Button for AI */}
          {!isUser && msg?.text && (
            <button 
              onClick={() => copyToClipboard(msg.id, msg.text)}
              className="absolute -right-9 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer"
              title="Copy message"
            >
              {copiedId === msg.id ? <CheckCircle size={15} className="text-emerald-400" weight="bold" /> : <Copy size={15} weight="bold" />}
            </button>
          )}
        </div>
        
        {/* Timestamp */}
        {msg.created_at && (
          <div className={`text-[10px] text-gray-500 flex items-center gap-1 ${isUser ? 'justify-end mr-1' : 'ml-1'}`}>
            <Clock size={10} weight="bold" /> {formatTime(msg.created_at)}
          </div>
        )}
      </div>
    </div>
  );
});
MessageBubble.displayName = 'MessageBubble';

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Hook for Voice Input
  const { 
    isListening, 
    transcript, 
    error: voiceError, 
    isSupported: isVoiceSupported, 
    startListening, 
    stopListening,
    setError: setVoiceError
  } = useVoiceInput();

  const [baseInputText, setBaseInputText] = useState('');

  // Sync Voice transcript into the user input stream
  useEffect(() => {
    if (isListening) {
      setInput(baseInputText + transcript);
    }
  }, [transcript, isListening, baseInputText]);

  // Voice Error Toasts auto-clear
  useEffect(() => {
    if (voiceError) {
      const t = setTimeout(() => setVoiceError(''), 4000);
      return () => clearTimeout(t);
    }
  }, [voiceError, setVoiceError]);

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      const spacing = input.length > 0 && !input.endsWith(' ') ? ' ' : '';
      setBaseInputText(input + spacing);
      startListening();
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && !conversationId && messages.length === 0) {
      api.get('/ai-chat/conversations')
        .then(res => {
          if (res.data.conversations?.length > 0) {
            const convId = res.data.conversations[0].id;
            setConversationId(convId);
            return api.get(`/ai-chat/conversations/${convId}/messages`);
          }
          return null;
        })
        .then(mRes => {
          if (mRes) {
            setMessages(mRes.data.messages?.map(m => ({ 
               id: m.id, 
               sender: m.sender_type, 
               text: m.message_text, 
               created_at: m.created_at 
            })) || []);
          } else {
            setMessages([{ id: 'welcome', sender: 'ai', text: 'Hi there! I am your AI Study Assistant. Ask me anything about exams, preparation, or platform features!', created_at: new Date().toISOString() }]);
          }
        })
        .catch((err) => {
           console.error("Chatbot Load Error:", err);
           setMessages([{ id: 'welcome-error', sender: 'ai', text: 'Hi! Ready to help... though I am having a bit of trouble connecting.', created_at: new Date().toISOString() }]);
        });
    }
  }, [isOpen, conversationId, messages.length]);

  // Auto-scroll anytime messages changes or typing/streaming flags toggle
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isStreaming, scrollToBottom]);

  const simulateStream = async (msgId, fullText) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // Split by token grouping spaces
    const tokens = fullText.split(/(\s+)/);
    let currentText = '';
    
    for (let i = 0; i < tokens.length; i++) {
      if (signal.aborted) break;
      
      currentText += tokens[i];
      
      // We wrap the functional state update precisely so React can batch appropriately
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: currentText } : m));
      
      // Simulate typing delay, ignore empty spaces
      if (tokens[i].trim() !== '') {
        await new Promise(r => setTimeout(r, Math.random() * 20 + 20)); // 20-40ms dictation
      }
    }
    
    setIsStreaming(false);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  };

  const handleSend = async (textOverride = null) => {
    const textToSend = typeof textOverride === 'string' ? textOverride : input;
    if (!textToSend.trim() || isTyping || isStreaming) return;

    const userMsg = textToSend.trim();
    setInput('');
    
    // Optimistic UI
    const tempUserId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempUserId, sender: 'user', text: userMsg, created_at: new Date().toISOString() }]);
    
    setIsTyping(true); // "AI is typing..."

    try {
      const res = await api.post('/chat', { message: userMsg, conversation_id: conversationId || "guest" });
      const data = res.data;
      
      console.log("Chat API response:", data);
      
      if (data.conversation_id && data.conversation_id !== 'guest') {
         setConversationId(data.conversation_id);
      }

      const aiMessageText = data?.response || "Something went wrong";

      setIsTyping(false); // Stop typing indicator
      setIsStreaming(true); // Start streaming lock
      
      const aiMsgId = Date.now().toString();
      
      // Inject empty AI bubble
      setMessages(prev => [
        ...prev,
        { id: aiMsgId, sender: 'ai', text: '', created_at: new Date().toISOString() }
      ]);

      // Execute simulated stream
      simulateStream(aiMsgId, aiMessageText);

    } catch (err) {
      console.error("Chat API fetch error:", err);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        sender: 'ai', 
        text: 'Something went wrong. Please try again.',
        created_at: new Date().toISOString()
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = useCallback((id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  return (
    <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end pointer-events-none w-full sm:w-auto">
      
      {/* Chat Window */}
      {isOpen && (
        <div className="pointer-events-auto h-[100dvh] w-full sm:h-[650px] sm:w-[420px] bg-[#0A0D15] sm:rounded-[24px] shadow-2xl shadow-violet-500/10 border-0 sm:border border-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 relative">
          
          {/* Header */}
          <div className="bg-[#111827]/90 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/30">
                  <Sparkle size={24} weight="fill" className="text-violet-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111827] rounded-full shadow-sm shadow-emerald-500/50" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[15px] text-white flex items-center gap-1.5">
                  AI Study Assistant 
                </span>
                <span className="text-[11px] text-gray-400 font-medium">Ask anything about exams or prep</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} weight="bold" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-[#0B0F1A] to-[#0A0D15] custom-scrollbar scroll-smooth">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                msg={msg} 
                copyToClipboard={copyToClipboard} 
                copiedId={copiedId} 
              />
            ))}
            
            {/* Initial Typing Indicator (Waiting for full payload fetch) */}
            {isTyping && (
              <div className="flex w-full justify-start animate-in fade-in">
                 <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mr-3 mt-1 border border-white/5">
                    <Sparkle size={14} weight="fill" className="text-amber-400 animate-pulse" />
                 </div>
                <div className="max-w-[80%] bg-[#111827] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 font-medium">AI is typing...</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>

          {/* Quick Suggestions & Input Area */}
          <div className="bg-[#111827]/90 backdrop-blur-md border-t border-white/5 p-4 shrink-0 flex flex-col gap-3 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.3)] relative z-10 w-full">
            
            {/* Suggested Prompts */}
            {messages.length < 3 && !isTyping && !isStreaming && (
             <div className="flex gap-2.5 overflow-x-auto pb-1 pt-0.5 hide-scrollbar w-full">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(suggestion)}
                    disabled={isTyping || isStreaming}
                    className="whitespace-nowrap px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-[12px] text-gray-300 hover:text-white hover:bg-violet-500/30 hover:border-violet-500/40 transition-all font-medium disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {suggestion}
                  </button>
                ))}
             </div>
            )}
            
            {/* Stop Stream Button */}
            {isStreaming && (
              <div className="flex justify-center w-full mb-1">
                <button 
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#0A0D15] border border-white/10 text-[11px] text-gray-300 hover:text-white hover:border-red-500/50 hover:bg-red-500/10 transition-colors z-20"
                >
                  <StopCircle size={14} weight="fill" className="text-red-400" /> Stop generation
                </button>
              </div>
            )}

            {/* Error Toast for Voice Input */}
            {voiceError && (
              <div className="absolute top-[-36px] left-1/2 -translate-x-1/2 bg-red-500/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap animate-in slide-in-from-bottom-2 fade-in">
                {voiceError}
              </div>
            )}

            <div className="flex items-end gap-2 relative group w-full">
              <textarea 
                ref={inputRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (!isListening) setBaseInputText(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening... Speak now" : "Ask about exams, preparation, or platform features..."}
                className={`flex-1 max-h-32 min-h-[48px] bg-[#0A0D15] border rounded-[14px] pl-4 pr-24 py-3.5 text-[14px] text-white outline-none transition-all resize-none hide-scrollbar w-full ${
                  isListening 
                    ? 'border-red-500/50 ring-1 ring-red-500/30 placeholder-red-400/70 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-500/5' 
                    : 'border-white/10 placeholder-gray-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30'
                }`}
                disabled={isTyping || isStreaming}
                rows={1}
                style={{ height: input ? `${Math.min(inputRef.current?.scrollHeight || 48, 120)}px` : '48px' }}
              />
              
              <div className="absolute right-1 bottom-1 flex items-center p-0.5 gap-0.5 h-[40px]">
                {/* Voice Input Button */}
                {isVoiceSupported && (
                  <button 
                    onClick={handleToggleMic}
                    disabled={isTyping || isStreaming}
                    className={`w-[36px] h-[36px] shrink-0 rounded-[10px] flex items-center justify-center transition-all shadow-sm ${
                       isListening 
                         ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' 
                         : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30'
                    }`}
                    title={isListening ? "Stop listening" : "Use microphone"}
                  >
                    {isListening ? (
                      <div className="relative flex items-center justify-center">
                        <Microphone size={20} weight="fill" className="relative z-10" />
                        <div className="absolute inset-0 bg-red-500/40 rounded-full animate-ping opacity-75"></div>
                      </div>
                    ) : (
                      <Microphone size={20} weight="regular" />
                    )}
                  </button>
                )}

                {/* Send Button */}
                <button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping || isStreaming}
                  className="w-[36px] h-[36px] shrink-0 bg-violet-600 hover:bg-violet-500 rounded-[10px] flex items-center justify-center text-white disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-violet-600 transition-all hover:scale-105 active:scale-95 shadow-md shadow-violet-500/20"
                >
                  <PaperPlaneRight size={18} weight="fill" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Entry Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto relative group w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] bg-[#111827] rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-all duration-300 sm:mr-4 sm:mb-4 mb-4 mr-4 border border-white/10"
        >
          {/* Subtle Outer Glow / Pulse */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-600 opacity-20 blur-xl group-hover:opacity-40 animate-pulse transition-opacity" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-600 to-emerald-500 opacity-40 animate-spin-slow mix-blend-screen" style={{ animationDuration: '4s' }} />
          
          <div className="absolute inset-[2px] rounded-full bg-[#111827] z-0" />
          <Sparkle size={32} weight="fill" className="relative z-10 text-violet-400 drop-shadow-md group-hover:rotate-12 group-hover:text-amber-300 transition-all duration-300" />
          
          {/* Notification Badge */}
          <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 border-2 border-[#111827] rounded-full animate-bounce shadow-sm" />
        </button>
      )}

      {/* Basic responsive Styles to hide standard scrollbars */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
