"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, VolumeX, Settings } from "lucide-react";
import { useState } from "react";
import { SystemPromptKey, SYSTEM_PROMPTS } from "@/hooks/useOllama";

interface VoiceControlsProps {
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
  isThinking: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  isSupported: boolean;
  currentMode: SystemPromptKey;
  onModeChange: (mode: SystemPromptKey) => void;
}

export default function VoiceControls({
  isListening,
  isSpeaking,
  isLoading,
  isThinking,
  onStartListening,
  onStopListening,
  isSupported,
  currentMode,
  onModeChange,
}: VoiceControlsProps) {
  const [showSettings, setShowSettings] = useState(false);

  const handleMicClick = () => {
    if (isListening) {
      onStopListening();
    } else {
      onStartListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="bg-white border border-gray-300 rounded-lg px-8 py-4 shadow-lg">
          <p className="text-gray-700 text-sm">
            Voice features not supported in this browser
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Voice Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4">
        {/* Settings Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowSettings(!showSettings)}
          className="p-4 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-700" />
        </motion.button>

        {/* Main Microphone Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleMicClick}
          disabled={isLoading || isThinking}
          className={`
            p-8 rounded-full border-2 transition-all duration-300 shadow-lg
            ${
              isListening
                ? "bg-black border-gray-800 pulse-shadow"
                : "bg-white border-gray-300 hover:border-gray-400"
            }
            ${isLoading || isThinking ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : isListening ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-gray-700" />
          )}
        </motion.button>

        {/* Speaking Indicator */}
        <motion.div
          animate={isSpeaking ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={{ repeat: isSpeaking ? Infinity : 0, duration: 0.6 }}
          className={`
            p-3 rounded-full border transition-all duration-300 shadow-lg
            ${
              isSpeaking
                ? "bg-black border-gray-800"
                : "bg-white border-gray-300"
            }
          `}
        >
          {isSpeaking ? (
            <Volume2 className="w-5 h-5 text-white" />
          ) : (
            <VolumeX className="w-5 h-5 text-gray-400" />
          )}
        </motion.div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-32 left-1/2 transform -translate-x-1/2 w-80"
        >
          <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              AI Assistant Mode
            </h3>
            <div className="space-y-3">
              {Object.entries(SYSTEM_PROMPTS).map(([key, description]) => (
                <button
                  key={key}
                  onClick={() => {
                    onModeChange(key as SystemPromptKey);
                    setShowSettings(false);
                  }}
                  className={`
                    w-full text-left p-4 rounded-lg transition-colors border
                    ${
                      currentMode === key
                        ? "bg-black border-gray-800 text-white"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"
                    }
                  `}
                >
                  <div className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  <div className="text-xs opacity-70 mt-1">
                    {description.slice(0, 60)}...
                  </div>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Status Indicators */}
      <div className="fixed top-8 right-8 space-y-2">
        {isListening && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-black rounded-full animate-pulse" />
              <span className="text-gray-900 text-sm font-medium">
                Listening...
              </span>
            </div>
          </motion.div>
        )}

        {isSpeaking && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-black border border-gray-800 rounded-lg px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-medium">
                Speaking...
              </span>
            </div>
          </motion.div>
        )}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
              <span className="text-gray-700 text-sm font-medium">
                AI Thinking...
              </span>
            </div>
          </motion.div>
        )}

        {isLoading && !isThinking && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-gray-200 border border-gray-300 rounded-lg px-4 py-2 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
              <span className="text-gray-700 text-sm font-medium">
                Processing...
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
