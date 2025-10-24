"use client";

import { motion } from "framer-motion";
import {
  MessageCircle,
  TrendingUp,
  Car,
  Calendar,
  Award,
  Leaf,
} from "lucide-react";
import { UserAppData } from "@/hooks/useAppContext";

interface SuggestedQuestionsProps {
  appData: UserAppData;
  onQuestionClick: (question: string) => void;
  isVisible: boolean;
}

const SuggestedQuestions = ({
  appData,
  onQuestionClick,
  isVisible,
}: SuggestedQuestionsProps) => {
  const getRelevantQuestions = () => {
    if (!appData.isAuthenticated) {
      return [
        "How does ride sharing work?",
        "What are the benefits of carpooling?",
        "How can I save money on transportation?",
        "What is the environmental impact of ride sharing?",
      ];
    }

    const questions = [];

    // Rides-related questions
    if (appData.rides?.length > 0) {
      questions.push(
        "What are my upcoming rides?",
        "Show me my recent trip history",
        "How much money have I saved this month?"
      );
    } else {
      questions.push(
        "How do I book my first ride?",
        "What should I know about ride sharing?"
      );
    }

    // Stats-related questions
    if (appData.rideStats) {
      questions.push(
        "What are my ride statistics?",
        "How is my completion rate?",
        "What's my average rating?"
      );
    }

    // Environmental impact questions
    if (appData.environmentalImpact) {
      questions.push(
        "How much CO2 have I saved?",
        "What's my environmental impact?"
      );
    }

    // Achievement questions
    if (appData.achievements?.length > 0) {
      questions.push("Show me my achievements", "What badges have I earned?");
    }

    // General helpful questions
    questions.push(
      "How can I improve my trust score?",
      "What are eco coins and how do I earn them?",
      "Tips for being a good passenger",
      "I want to go to the airport",
      "What rides are available right now?"
    );

    return questions.slice(0, 6); // Limit to 6 questions
  };

  const questions = getRelevantQuestions();

  const getQuestionIcon = (question: string) => {
    if (question.includes("upcoming") || question.includes("schedule"))
      return Calendar;
    if (
      question.includes("stats") ||
      question.includes("rating") ||
      question.includes("completion")
    )
      return TrendingUp;
    if (
      question.includes("ride") ||
      question.includes("trip") ||
      question.includes("book")
    )
      return Car;
    if (
      question.includes("achievement") ||
      question.includes("badge") ||
      question.includes("trust")
    )
      return Award;
    if (
      question.includes("CO2") ||
      question.includes("environmental") ||
      question.includes("eco")
    )
      return Leaf;
    return MessageCircle;
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="absolute bottom-40 right-6 z-20 w-72"
    >
      <div className="bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-gray-200/50">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-1">
            {appData.isAuthenticated ? "🚗 Quick Questions" : "🌟 Get Started"}
          </h3>
          <p className="text-xs text-gray-600">
            {appData.isAuthenticated
              ? "Ask about your rides & stats"
              : "Click any question below"}
          </p>
        </div>

        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {questions.slice(0, 6).map((question, index) => {
            const IconComponent = getQuestionIcon(question);
            return (
              <motion.button
                key={`${question}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                onClick={() => onQuestionClick(question)}
                className="flex items-center gap-2 p-2 text-left bg-gray-50 hover:bg-blue-50 rounded-lg transition-all duration-200 border border-gray-200 hover:border-blue-300 group text-xs"
              >
                <div className="shrink-0 w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <IconComponent className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-xs text-gray-700 group-hover:text-blue-700 font-medium line-clamp-2">
                  {question}
                </span>
              </motion.button>
            );
          })}
        </div>

        {appData.isAuthenticated && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Connected</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SuggestedQuestions;
