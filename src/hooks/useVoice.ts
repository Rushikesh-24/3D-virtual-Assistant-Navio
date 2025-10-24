"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
  speak: (text: string, language?: string) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  availableVoices: SpeechSynthesisVoice[];
  currentVoice: SpeechSynthesisVoice | null;
  setVoice: (voice: SpeechSynthesisVoice | null) => void;
}

// Type declarations for Web Speech API
interface SpeechRecognitionInterface extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognitionInterface, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((
        this: SpeechRecognitionInterface,
        ev: SpeechRecognitionErrorEvent
      ) => void)
    | null;
  onend: ((this: SpeechRecognitionInterface, ev: Event) => void) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
  }
}

export const useVoice = (): UseVoiceReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("en-US");
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(
    null
  );

  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check if browser supports speech recognition and synthesis
    const hasRecognition =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    const hasSynthesis = "speechSynthesis" in window;

    setIsSupported(hasRecognition && hasSynthesis);

    if (hasRecognition) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = currentLanguage;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript.trim());
          setIsListening(false);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    if (hasSynthesis) {
      synthRef.current = window.speechSynthesis;

      // Load available voices
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Auto-select Indian Hindi female voice if available
        const hindiVoice =
          voices.find(
            (voice) =>
              voice.lang.includes("hi") &&
              voice.name.toLowerCase().includes("female")
          ) ||
          voices.find((voice) => voice.lang.includes("hi")) ||
          voices.find(
            (voice) =>
              voice.name.toLowerCase().includes("indian") &&
              voice.name.toLowerCase().includes("female")
          );

        if (hindiVoice) {
          setCurrentVoice(hindiVoice);
          console.log("Selected Hindi voice:", hindiVoice.name);
        } else {
          // Fallback to any female voice
          const femaleVoice = voices.find((voice) =>
            voice.name.toLowerCase().includes("female")
          );
          if (femaleVoice) {
            setCurrentVoice(femaleVoice);
            console.log("Selected female voice:", femaleVoice.name);
          }
        }
      };

      // Load voices immediately
      loadVoices();

      // Load voices when they become available (some browsers load them asynchronously)
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [currentLanguage]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      recognitionRef.current.start();
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const clearTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  const speak = useCallback(
    async (text: string, language?: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!synthRef.current) {
          reject(new Error("Speech synthesis not supported"));
          return;
        }

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set voice and language
        if (currentVoice) {
          utterance.voice = currentVoice;
        }

        // Set language (use parameter or current language)
        utterance.lang = language || currentLanguage;

        // Configure speech parameters for Indian female voice
        utterance.rate = 0.85; // Slightly slower for clarity
        utterance.pitch = 1.1; // Slightly higher pitch for female voice
        utterance.volume = 0.9;

        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        synthRef.current.speak(utterance);
      });
    },
    [currentVoice, currentLanguage]
  );

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const setLanguage = useCallback(
    (lang: string) => {
      setCurrentLanguage(lang);

      // Update speech recognition language
      if (recognitionRef.current) {
        recognitionRef.current.lang = lang;
      }

      // Auto-select appropriate voice for the language
      const voices = availableVoices;
      let preferredVoice = null;

      if (lang.includes("hi")) {
        // Hindi language - prefer Indian female voice
        preferredVoice =
          voices.find(
            (voice) =>
              voice.lang.includes("hi") &&
              voice.name.toLowerCase().includes("female")
          ) || voices.find((voice) => voice.lang.includes("hi"));
      } else if (lang.includes("en")) {
        // English - prefer female voice
        preferredVoice =
          voices.find(
            (voice) =>
              voice.lang.includes("en") &&
              voice.name.toLowerCase().includes("female")
          ) || voices.find((voice) => voice.lang.includes("en"));
      }

      if (preferredVoice) {
        setCurrentVoice(preferredVoice);
        console.log("Auto-selected voice for", lang, ":", preferredVoice.name);
      }
    },
    [availableVoices]
  );

  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setCurrentVoice(voice);
    if (voice) {
      console.log("Voice set to:", voice.name, "- Language:", voice.lang);
    }
  }, []);

  return {
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
  };
};

// Extend the Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognitionInterface;
    };
  }
}
