"use client";

import { useState, useCallback } from "react";
import {
  UserAppData,
  formatUserStatsForAI,
  formatUpcomingRidesForAI,
  formatRecentRidesForAI,
  formatAvailableRidesForAI,
  Ride,
} from "./useAppContext";
import {
  getLocationFromText,
  extractDestination,
  isLocationQuery,
} from "../utils/geocoding";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

interface UseOllamaReturn {
  isLoading: boolean;
  isThinking: boolean;
  error: string | null;
  generateResponse: (
    prompt: string,
    systemPrompt?: string,
    appData?: UserAppData
  ) => Promise<string>;
  abortGeneration: () => void;
  lastResponse: string;
  thinkingText: string;
  shouldStopListening: boolean;
  resetStopListening: () => void;
}

// App-specific system prompt for ride-sharing assistant
const APP_SYSTEM_PROMPT = `You are an AI assistant for a ride-sharing application. You have access to the user's ride history, statistics, achievements, and environmental impact data. 

Your primary functions:
1. Answer questions about the user's ride statistics, upcoming rides, recent trips, and achievements
2. Provide insights about their environmental impact and savings
3. Help with ride-related queries and issues
4. Search for available rides when users ask about going to specific places
5. Suggest improvements for better ride-sharing experience

When users ask about going to a specific place, you'll get information about available rides from the database. Present this information in a helpful, organized way.

You should be helpful, concise, and focus on ride-sharing related topics. When users ask about their data, provide specific information from their profile.

Always respond primarily in English, but you can include Hindi phrases occasionally for warmth and cultural connection.`;

export const useOllama = (): UseOllamaReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState("");
  const [thinkingText, setThinkingText] = useState("");
  const [shouldStopListening, setShouldStopListening] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  // Get available rides for location-based queries
  const availableRides = useQuery(api.rides.getAvailableRides, {});

  const resetStopListening = useCallback(() => {
    setShouldStopListening(false);
  }, []);

  const generateResponse = useCallback(
    async (
      prompt: string,
      systemPrompt?: string,
      appData?: UserAppData
    ): Promise<string> => {
      // Prevent multiple concurrent requests
      if (isLoading || isThinking) {
        console.log("AI is already processing, rejecting new request");
        return "Please wait for the current response to complete.";
      }

      // Create new abort controller for this request
      const controller = new AbortController();
      setAbortController(controller);

      setIsLoading(true);
      setIsThinking(true);
      setError(null);
      setThinkingText("");
      setLastResponse("");
      setShouldStopListening(true); // Stop listening when processing starts
      console.log("AI processing started - microphone should be stopped");

      try {
        // Check if this is a location-based query
        const isLocation = isLocationQuery(prompt);
        let availableRidesInfo = "";

        if (isLocation && appData?.isAuthenticated) {
          const destination = extractDestination(prompt);
          setThinkingText("Searching for available rides...");

          if (destination) {
            // Try to get location coordinates for the destination
            const destinationLocation = getLocationFromText(destination);

            if (availableRides && availableRides.length > 0) {
              // Filter rides that might match the destination
              let matchingRides = availableRides as Ride[];

              if (destinationLocation) {
                // Filter rides based on destination proximity (simple matching)
                matchingRides = (availableRides as Ride[]).filter((ride) => {
                  const endName = ride.endLocation.name.toLowerCase();
                  const destName = destinationLocation.name.toLowerCase();
                  const searchDest = destination.toLowerCase();

                  return (
                    endName.includes(searchDest) ||
                    searchDest.includes(endName) ||
                    endName.includes(destName) ||
                    destName.includes(endName)
                  );
                });
              }

              // If no exact matches, show general available rides
              if (matchingRides.length === 0) {
                matchingRides = (availableRides as Ride[]).slice(0, 3); // Show first 3 available rides
                availableRidesInfo =
                  `No rides found specifically to "${destination}", but here are some available rides:\n` +
                  formatAvailableRidesForAI(matchingRides);
              } else {
                availableRidesInfo = formatAvailableRidesForAI(matchingRides);
              }
            } else {
              availableRidesInfo = `No rides are currently available to "${destination}". You might want to create a ride request or check again later.`;
            }
          } else {
            // General available rides query (no specific destination)
            if (availableRides && availableRides.length > 0) {
              const ridestoShow = availableRides.slice(0, 5) as Ride[]; // Show first 5 available rides
              availableRidesInfo =
                "Here are the currently available rides:\n" +
                formatAvailableRidesForAI(ridestoShow);
            } else {
              availableRidesInfo =
                "No rides are currently available. You might want to create a ride or check again later.";
            }
          }
        }

        // Determine if this is an app-related query
        const isAppQuery =
          appData &&
          appData.isAuthenticated &&
          (isLocation ||
            /ride|trip|journey|travel|drive|passenger|driver|book|schedule|upcoming|recent|stats|statistics|achievement|eco|environment|save|money|distance|trust|score|level|coins/.test(
              prompt.toLowerCase()
            ) ||
            /where|when|how many|what time|my rides|my trips|my stats|my achievements/.test(
              prompt.toLowerCase()
            ));

        let contextualPrompt = prompt;
        let finalSystemPrompt = systemPrompt || "";

        if (isAppQuery && appData) {
          // Add user context for app-related queries
          const userStats = formatUserStatsForAI(appData);
          const upcomingRides = formatUpcomingRidesForAI(appData.rides);
          const recentRides = formatRecentRidesForAI(appData.rides);

          const appContext = `
User Context:
${userStats}

${upcomingRides}

${recentRides}

${availableRidesInfo ? `\nAvailable Rides for "${extractDestination(prompt) || "destination"}":\n${availableRidesInfo}` : ""}

User's Question: ${prompt}

Please provide a helpful response based on the user's data above. Be specific and use the actual data when answering.${availableRidesInfo ? " If available rides were found, present them clearly and ask if the user would like help booking one." : ""}`;

          contextualPrompt = appContext;
          finalSystemPrompt = APP_SYSTEM_PROMPT;
        }

        const fullPrompt = finalSystemPrompt
          ? `${finalSystemPrompt}\n\n${contextualPrompt}`
          : contextualPrompt;

        const response = await fetch("http://localhost:11434/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "deepseek-r1:1.5b",
            prompt: fullPrompt,
            stream: true, // Enable streaming for real-time response
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body reader available");
        }

        let fullResponse = "";
        let isFirstChunk = true;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split("\n").filter((line) => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);

                if (data.response) {
                  if (isFirstChunk) {
                    setIsThinking(false);
                    setThinkingText("");
                    isFirstChunk = false;
                  }

                  fullResponse += data.response;
                  setLastResponse(fullResponse);
                }
              } catch {
                // Skip invalid JSON lines
                console.warn("Failed to parse JSON line:", line);
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (!fullResponse) {
          throw new Error("No response received from Ollama");
        }

        const cleanResponse = fullResponse.trim();
        setLastResponse(cleanResponse);

        // Keep listening stopped after processing completes
        // User must manually click mic to start listening again
        console.log(
          "AI processing completed - microphone remains stopped until user clicks mic"
        );

        return cleanResponse;
      } catch (err) {
        // Handle abort errors differently
        if (err instanceof Error && err.name === "AbortError") {
          console.log("Generation was aborted by user");
          setError("Generation interrupted by user");
          setLastResponse("Generation stopped.");
          return "Generation stopped.";
        }

        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred";

        console.error("Ollama API error:", err);
        setError(errorMessage);

        // Return a fallback response
        const fallbackResponse =
          "I'm sorry, I'm having trouble connecting to the AI service right now. Please make sure Ollama is running with the deepseek-r1:7b.";
        setLastResponse(fallbackResponse);
        return fallbackResponse;
      } finally {
        setIsLoading(false);
        setIsThinking(false);
        setAbortController(null);
      }
    },
    [availableRides, isLoading, isThinking]
  );

  const abortGeneration = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
  }, [abortController]);

  return {
    isLoading,
    isThinking,
    error,
    generateResponse,
    abortGeneration,
    lastResponse,
    thinkingText,
    shouldStopListening,
    resetStopListening,
  };
};

// System prompts for different modes
export const SYSTEM_PROMPTS = {
  default:
    "You are a helpful AI assistant. Provide clear, concise, and friendly responses.",
  techTutor:
    "You are a tech tutor AI. Explain technical concepts in a clear, educational manner. Use examples and analogies when helpful.",
  healthCoach:
    "You are a health and wellness coach. Provide supportive, evidence-based advice about health, fitness, and well-being. Always remind users to consult healthcare professionals for medical concerns.",
  creativeMuse:
    "You are a creative AI assistant. Help users with creative writing, brainstorming, artistic inspiration, and imaginative problem-solving. Be encouraging and think outside the box.",
  productivity:
    "You are a productivity coach. Help users organize their time, set goals, and develop efficient workflows. Provide practical, actionable advice.",
} as const;

export type SystemPromptKey = keyof typeof SYSTEM_PROMPTS;
