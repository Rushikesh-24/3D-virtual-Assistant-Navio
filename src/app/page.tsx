"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useVoice } from "@/hooks/useVoice";
import { useOllama, SystemPromptKey, SYSTEM_PROMPTS } from "@/hooks/useOllama";
import { useAppContext } from "@/hooks/useAppContext";
import { SignIn, useUser } from "@clerk/nextjs";
import VoiceControls from "@/components/VoiceControls";
import Subtitles from "@/components/Subtitles";
import ConnectionIndicator from "@/components/ConnectionIndicator";
import ConversationDisplay from "@/components/ConversationDisplay";
import ModelControls from "@/components/ModelControls";
import EmergencyStop from "@/components/EmergencyStop";
import SuggestedQuestions from "@/components/SuggestedQuestions";

// Dynamically import Avatar to avoid SSR issues with Three.js
const Avatar = dynamic(() => import("@/components/Avatar"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Home() {
  const [currentMode, setCurrentMode] = useState<SystemPromptKey>("default");
  const [modelPositionX, setModelPositionX] = useState(1);
  const [modelPositionY, setModelPositionY] = useState(-4.0);

  // Get user authentication and app data
  const { isSignedIn, isLoaded } = useUser();
  const appData = useAppContext();

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    clearTranscript,
    speak,
    stopSpeaking,
    isSpeaking,
    isSupported,
    currentLanguage,
    setLanguage,
    availableVoices,
    currentVoice,
    setVoice,
  } = useVoice();

  const {
    isLoading,
    isThinking,
    error,
    generateResponse,
    abortGeneration,
    lastResponse,
    thinkingText,
    shouldStopListening,
    resetStopListening,
  } = useOllama();

  // Handle when user finishes speaking
  const handleUserInput = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      // Prevent processing if already loading
      if (isLoading || isThinking) {
        console.log("AI is already processing, ignoring input:", userText);
        return;
      }

      console.log("Processing user input:", userText);

      try {
        const systemPrompt = SYSTEM_PROMPTS[currentMode];
        // Pass app data to generate response for context-aware answers
        const response = await generateResponse(
          userText,
          systemPrompt,
          appData
        );

        // Use the response from the hook, but also speak it in the current language
        await speak(response, currentLanguage);

        // Keep suggestions visible (removed setShowSuggestions(false))
      } catch (err) {
        console.error("Error handling user input:", err);
      }
    },
    [
      currentMode,
      generateResponse,
      speak,
      currentLanguage,
      appData,
      isLoading,
      isThinking,
    ]
  );

  // Handle suggested question clicks
  const handleSuggestedQuestion = useCallback(
    async (question: string) => {
      // Don't hide suggestions when clicking them
      await handleUserInput(question);
    },
    [handleUserInput]
  );

  useEffect(() => {
    if (transcript && transcript.trim() && !isListening) {
      console.log("Processing transcript:", transcript);
      handleUserInput(transcript);
      // Clear transcript after processing to prevent infinite loop
      clearTranscript();
    }
  }, [transcript, isListening, handleUserInput, clearTranscript]);

  // Handle automatic stopping of listening when ride search is complete
  useEffect(() => {
    if (shouldStopListening && isListening) {
      console.log("Stopping listening after ride search completion");
      stopListening();
      resetStopListening();
    }
  }, [shouldStopListening, isListening, stopListening, resetStopListening]);

  // Reset stop listening flag when user manually starts listening
  const handleStartListening = useCallback(() => {
    console.log(
      "User manually clicked mic - resetting stop flag and starting listening"
    );
    resetStopListening();
    startListening();
  }, [resetStopListening, startListening]);

  // Initialize English language and set Default voice or Samantha (en-US)
  useEffect(() => {
    // Set English as default language and find Default voice or Samantha
    if (availableVoices.length > 0 && currentLanguage === "en-US") {
      console.log(
        "Available voices loaded, setting up Default or Samantha voice..."
      );

      // First try to find Samantha (en-US), otherwise use default voice
      const samanthaVoice = availableVoices.find(
        (voice) => voice.lang === "en-US" && voice.name.includes("Samantha")
      );

      if (samanthaVoice && samanthaVoice !== currentVoice) {
        console.log("Setting Samantha voice:", samanthaVoice.name);
        setVoice(samanthaVoice);
      } else if (!currentVoice) {
        // If no Samantha found and no current voice set, use default (null)
        console.log("Using default system voice");
        setVoice(null);
      }
    }
  }, [availableVoices, currentLanguage, currentVoice, setVoice]);

  // Keyboard controls for model positioning (helpful for Mixamo character adjustment)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "arrowup":
            e.preventDefault();
            setModelPositionY((prev) => prev + 0.1);
            break;
          case "arrowdown":
            e.preventDefault();
            setModelPositionY((prev) => prev - 0.1);
            break;
          case "arrowleft":
            e.preventDefault();
            setModelPositionX((prev) => prev - 0.1);
            break;
          case "arrowright":
            e.preventDefault();
            setModelPositionX((prev) => prev + 0.1);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const handleModeChange = (mode: SystemPromptKey) => {
    setCurrentMode(mode);
    // Announce mode change
    const modeNames = {
      default: "Default Assistant",
      techTutor: "Tech Tutor",
      healthCoach: "Health Coach",
      creativeMuse: "Creative Muse",
      productivity: "Productivity Coach",
    };
    speak(`Switched to ${modeNames[mode]} mode`, currentLanguage);
  };

  const handlePositionChange = useCallback((x: number, y: number) => {
    setModelPositionX(x);
    setModelPositionY(y);
  }, []);

  const handlePositionReset = useCallback(() => {
    setModelPositionX(-0.1);
    setModelPositionY(-4.0);
  }, []);

  const handleInterrupt = useCallback(() => {
    // Stop AI generation
    abortGeneration();
    // Stop speech
    stopSpeaking();
    // Stop listening if active
    if (isListening) {
      stopListening();
    }
  }, [abortGeneration, stopSpeaking, isListening, stopListening]);

  // Show loading screen while checking authentication
  if (!isLoaded || appData.isLoading) {
    return (
      <main className="relative w-full h-screen overflow-hidden bg-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // Show sign-in if user is not authenticated
  if (!isSignedIn) {
    return (
      <main className="relative w-full h-screen overflow-hidden bg-linear-to-br from-blue-50 to-white flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              AI Ride Assistant
            </h1>
            <p className="text-gray-600">
              Sign in to access your personalized ride data and get answers
              about your trips, statistics, and achievements.
            </p>
          </motion.div>
          <SignIn />
        </div>
      </main>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-white">
      {/* Clean professional background with subtle grid */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-50 to-white" />
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Connection Status */}
        <ConnectionIndicator />

        {/* Header */}
        <header className="absolute top-6 left-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-white/95 backdrop-blur-md rounded-xl px-10 py-8 shadow-xl border border-gray-200/50 max-w-sm"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              AI Ride Assistant
            </h1>
            <p className="text-gray-600 text-base mb-3">
              {appData.isAuthenticated
                ? `Welcome back, ${appData.user?.name || "User"}!`
                : "Personal assistant for your rides"}
            </p>
            {appData.isAuthenticated && (
              <div className="flex items-center gap-3 mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">
                  Connected to your account
                </span>
              </div>
            )}
          </motion.div>
        </header>

        {/* Language and Voice Selector */}
        <div className="absolute top-6 right-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white/95 backdrop-blur-md rounded-xl px-8 py-6 shadow-xl border border-gray-200/50"
          >
            <div className="flex flex-col gap-6 min-w-60">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Language
                </label>
                <select
                  value={currentLanguage}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                >
                  <option value="en-US">🇺🇸 English (US)</option>
                  <option value="en-IN">🇮🇳 English (India)</option>
                  <option value="hi-IN">🇮🇳 हिन्दी (Hindi)</option>
                  <option value="hi">Hindi</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Voice ({availableVoices.length} available)
                </label>
                <select
                  value={currentVoice?.name || ""}
                  onChange={(e) => {
                    const voice = availableVoices.find(
                      (v) => v.name === e.target.value
                    );
                    setVoice(voice || null);
                  }}
                  className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                >
                  <option value="">Default Voice</option>
                  {availableVoices
                    .filter((voice) => {
                      const langCode = currentLanguage.split("-")[0];
                      return (
                        voice.lang.includes(langCode) ||
                        (langCode === "hi" && voice.lang.includes("hi")) ||
                        voice.name.toLowerCase().includes("indian")
                      );
                    })
                    .sort((a, b) => {
                      // Prioritize Samantha voice for en-US
                      if (currentLanguage === "en-US") {
                        const aIsSamantha = a.name
                          .toLowerCase()
                          .includes("samantha");
                        const bIsSamantha = b.name
                          .toLowerCase()
                          .includes("samantha");

                        if (aIsSamantha && !bIsSamantha) return -1;
                        if (!aIsSamantha && bIsSamantha) return 1;
                      }
                      return a.name.localeCompare(b.name);
                    })
                    .map((voice, index) => (
                      <option
                        key={`${voice.name}-${voice.lang}-${index}`}
                        value={voice.name}
                      >
                        {voice.name} ({voice.lang})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-1">
                  Current Voice
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  {currentVoice?.name || "System Default"}
                </div>
                {currentVoice && (
                  <div className="text-xs text-gray-500 mt-1">
                    {currentVoice.lang}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* 3D Avatar Container */}
        <div className="flex-1 w-full h-full p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="w-full h-full"
          >
            <Avatar
              isSpeaking={isSpeaking}
              positionX={modelPositionX}
              positionY={modelPositionY}
            />
          </motion.div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-24 right-6 max-w-sm"
          >
            <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-6 backdrop-blur-md">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Conversation Display */}
        <ConversationDisplay
          userText={transcript}
          aiText={lastResponse}
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          thinkingText={thinkingText}
        />

        {/* Subtitles - for center display */}
        <Subtitles
          userText={transcript}
          aiText={lastResponse}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />

        {/* Suggested Questions */}
        <SuggestedQuestions
          appData={appData}
          onQuestionClick={handleSuggestedQuestion}
          isVisible={!isSpeaking && !isLoading && !isThinking}
        />

        {/* Voice Controls */}
        <VoiceControls
          isListening={isListening}
          isSpeaking={isSpeaking}
          isLoading={isLoading}
          isThinking={isThinking}
          onStartListening={handleStartListening}
          onStopListening={stopListening}
          isSupported={isSupported}
          currentMode={currentMode}
          onModeChange={handleModeChange}
        />

        {/* Model Position Controls */}
        <ModelControls
          positionX={modelPositionX}
          positionY={modelPositionY}
          onPositionChange={handlePositionChange}
          onReset={handlePositionReset}
          onInterrupt={handleInterrupt}
          isGenerating={isLoading || isThinking}
          isSpeaking={isSpeaking}
        />

        {/* Emergency Stop Button */}
        <EmergencyStop
          onStop={handleInterrupt}
          isActive={isLoading || isThinking || isSpeaking}
        />
      </div>

      {/* Connection Status */}
      <div className="absolute bottom-6 left-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-gray-200/50"
        >
          <div className="text-xs font-semibold text-gray-700 mb-3">
            System Status
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`}
              ></div>
              <span className="text-xs text-gray-600">
                Ollama (deepseek-r1:7b): {isLoading ? "Processing..." : "Ready"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${isSupported ? "bg-green-400" : "bg-red-400"}`}
              ></div>
              <span className="text-xs text-gray-600">
                Voice: {isSupported ? "Supported" : "Not Available"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${appData.isAuthenticated ? "bg-green-400" : "bg-gray-400"}`}
              ></div>
              <span className="text-xs text-gray-600">
                Data: {appData.isAuthenticated ? "Connected" : "Guest Mode"}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
