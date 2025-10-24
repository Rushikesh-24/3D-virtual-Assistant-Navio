"use client";

import { motion, AnimatePresence } from "framer-motion";
import { StopCircle, Zap } from "lucide-react";

interface EmergencyStopProps {
  onStop: () => void;
  isActive: boolean; // Show when AI is generating or speaking
}

export default function EmergencyStop({
  onStop,
  isActive,
}: EmergencyStopProps) {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStop}
          className="group w-20 h-20 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl border-4 border-red-500 hover:border-red-400 transition-all duration-200 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            boxShadow:
              "0 8px 32px rgba(239, 68, 68, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Pulsing Ring Animation */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border-2 border-red-300"
          />

          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center">
            <StopCircle className="w-8 h-8 drop-shadow-lg" />
          </div>

          {/* Lightning Effect */}
          <motion.div
            animate={{
              opacity: [0, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-1 right-1"
          >
            <Zap className="w-4 h-4 text-yellow-300 drop-shadow-sm" />
          </motion.div>
        </motion.button>

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute right-24 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-3 rounded-lg text-sm font-medium shadow-xl"
        >
          Emergency Stop
          <div className="absolute top-1/2 -translate-y-1/2 right-[-6px] w-0 h-0 border-l-[6px] border-l-gray-900 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
