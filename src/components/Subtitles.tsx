"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface SubtitlesProps {
  userText: string;
  aiText: string;
  isListening: boolean;
  isSpeaking: boolean;
}

export default function Subtitles({
  userText,
  aiText,
  isListening,
  isSpeaking,
}: SubtitlesProps) {
  const [displayText, setDisplayText] = useState("");
  const [isUser, setIsUser] = useState(false);

  useEffect(() => {
    if (isListening && userText) {
      setDisplayText(userText);
      setIsUser(true);
    } else if (isSpeaking && aiText) {
      setDisplayText(aiText);
      setIsUser(false);
    } else if (!isListening && !isSpeaking) {
      // Clear text after a delay when not active
      const timer = setTimeout(() => setDisplayText(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [userText, aiText, isListening, isSpeaking]);

  if (!displayText) {
    return (
      <div className="fixed bottom-40 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-slate-400 text-lg">
            👋 Click the microphone to start talking with your AI assistant
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-40 left-1/2 transform -translate-x-1/2 w-full max-w-4xl px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${isUser}-${displayText.slice(0, 20)}`}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`
            p-6 rounded-2xl backdrop-blur-md border-2 transition-all duration-300
            ${
              isUser
                ? "bg-blue-500/20 border-blue-400/50"
                : "bg-slate-800/80 border-slate-600/50"
            }
          `}
        >
          <div className="flex items-start gap-3">
            <div
              className={`
              shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              ${
                isUser
                  ? "bg-blue-500 text-white"
                  : "bg-slate-600 text-slate-200"
              }
            `}
            >
              {isUser ? "👤" : "🤖"}
            </div>

            <div className="flex-1">
              <div
                className={`
                text-xs font-medium mb-2
                ${isUser ? "text-blue-300" : "text-slate-400"}
              `}
              >
                {isUser ? "You" : "AI Assistant"}
                {isListening && isUser && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="animate-pulse">●</span>
                    <span className="ml-1">Listening...</span>
                  </span>
                )}
                {isSpeaking && !isUser && (
                  <span className="ml-2 inline-flex items-center">
                    <span className="animate-pulse">●</span>
                    <span className="ml-1">Speaking...</span>
                  </span>
                )}
              </div>

              <p
                className={`
                text-lg leading-relaxed
                ${isUser ? "text-blue-100" : "text-slate-200"}
              `}
              >
                {displayText}
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
