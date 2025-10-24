"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { User, Bot, Brain, Mic } from "lucide-react";

interface Message {
  id: string;
  type: "user" | "thinking" | "ai";
  content: string;
  timestamp: Date;
}

interface ConversationDisplayProps {
  userText: string;
  aiText: string;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  thinkingText: string;
}

export default function ConversationDisplay({
  userText,
  aiText,
  isListening,
  isThinking,
  isSpeaking,
  thinkingText,
}: ConversationDisplayProps) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Add user message when speech is complete
  useEffect(() => {
    if (userText && !isListening) {
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: "user",
        content: userText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }
  }, [userText, isListening]);

  // Add thinking indicator
  useEffect(() => {
    if (isThinking) {
      const thinkingMessage: Message = {
        id: `thinking-${Date.now()}`,
        type: "thinking",
        content: "Thinking...",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, thinkingMessage]);
    } else {
      // Remove thinking message when done
      setMessages((prev) => prev.filter((msg) => msg.type !== "thinking"));
    }
  }, [isThinking]);

  // Add AI response
  useEffect(() => {
    if (aiText && !isThinking) {
      setMessages((prev) => {
        // Remove any existing AI message and thinking messages
        const filtered = prev.filter(
          (msg) => msg.type !== "ai" && msg.type !== "thinking"
        );
        const aiMessage: Message = {
          id: `ai-${Date.now()}`,
          type: "ai",
          content: aiText,
          timestamp: new Date(),
        };
        return [...filtered, aiMessage];
      });
    }
  }, [aiText, isThinking]);

  // Auto-clear old messages (keep last 6)
  useEffect(() => {
    if (messages.length > 6) {
      setMessages((prev) => prev.slice(-6));
    }
  }, [messages.length]);

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="w-4 h-4" />;
      case "thinking":
        return <Brain className="w-4 h-4 animate-pulse" />;
      case "ai":
        return <Bot className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case "user":
        return "bg-gray-100 border-gray-300 text-gray-900";
      case "thinking":
        return "bg-gray-50 border-gray-200 text-gray-700";
      case "ai":
        return "bg-black text-white border-gray-800";
      default:
        return "bg-white border-gray-200 text-gray-900";
    }
  };

  if (messages.length === 0 && !isListening) {
    return (
      <div className="fixed left-6 top-1/2 transform -translate-y-1/2 w-96">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Voice Assistant
            </h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Click the microphone button to start a conversation with your AI
            assistant. You&apos;ll see your speech transcribed in real-time, and
            watch the AI think through its response.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed left-8 top-1/2 transform -translate-y-1/2 w-96 max-h-[70vh] overflow-y-auto">
      <div className="space-y-4 pr-3">
        <AnimatePresence mode="popLayout">
          {isListening && (
            <motion.div
              key="listening"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-5 bg-gray-100 border border-gray-300 rounded-lg shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                  <Mic className="w-4 h-4 text-white animate-pulse" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    Listening...
                  </div>
                  {userText && (
                    <div className="text-sm text-gray-700 italic">
                      &quot;{userText}&quot;
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={`p-4 rounded-lg border shadow-sm ${getMessageStyle(
                message.type
              )}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === "ai" ? "bg-black" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={
                      message.type === "ai" ? "text-white" : "text-gray-700"
                    }
                  >
                    {getMessageIcon(message.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold mb-2">
                    {message.type === "ai"
                      ? "AI Assistant"
                      : message.type === "user"
                      ? "You"
                      : "Processing"}
                    {message.type === "thinking" && (
                      <span className="ml-2 text-xs opacity-70 font-normal">
                        Analyzing your request...
                      </span>
                    )}
                    {message.type === "ai" && isSpeaking && (
                      <span className="ml-2 text-xs opacity-70 font-normal">
                        Speaking...
                      </span>
                    )}
                  </div>
                  <div className="text-sm leading-relaxed">
                    {message.type === "thinking" && isThinking ? (
                      <div className="flex items-center gap-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        </div>
                        <span>Analyzing your request...</span>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className="text-xs opacity-50 mt-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
