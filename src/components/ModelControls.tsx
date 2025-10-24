"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Move, RotateCcw, Settings2, StopCircle } from "lucide-react";

interface ModelControlsProps {
  positionX: number;
  positionY: number;
  onPositionChange: (x: number, y: number) => void;
  onReset: () => void;
  onInterrupt: () => void;
  isGenerating: boolean;
  isSpeaking: boolean;
}

export default function ModelControls({
  positionX,
  positionY,
  onPositionChange,
  onReset,
  onInterrupt,
  isGenerating,
  isSpeaking,
}: ModelControlsProps) {
  const [showControls, setShowControls] = useState(false);

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowControls(!showControls)}
        className="fixed top-20 right-6 p-4 bg-white border border-gray-300 rounded-full shadow-lg hover:bg-gray-50 transition-colors z-50"
      >
        <Settings2 className="w-5 h-5 text-gray-700" />
      </motion.button>

      {/* Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-20 right-20 w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-8 z-40"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <Move className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Model Position
              </h3>
            </div>

            <div className="space-y-8">
              {/* Interrupt Control */}
              {(isGenerating || isSpeaking) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        {isGenerating
                          ? "AI is generating..."
                          : "AI is speaking..."}
                      </p>
                      <p className="text-xs text-red-600 mt-2">
                        Click to stop and interrupt
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onInterrupt}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* X Position Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  X Position: {positionX.toFixed(2)}
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="-3"
                    max="3"
                    step="0.1"
                    value={positionX}
                    onChange={(e) =>
                      onPositionChange(parseFloat(e.target.value), positionY)
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Left</span>
                    <span>Center</span>
                    <span>Right</span>
                  </div>
                </div>
              </div>

              {/* Y Position Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Y Position: {positionY.toFixed(2)}
                </label>
                <div className="relative">
                  <input
                    type="range"
                    min="-4"
                    max="2"
                    step="0.1"
                    value={positionY}
                    onChange={(e) =>
                      onPositionChange(positionX, parseFloat(e.target.value))
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Down</span>
                    <span>Center</span>
                    <span>Up</span>
                  </div>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onPositionChange(0, -2)}
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Default
                  </button>
                  <button
                    onClick={() => onPositionChange(0, -1)}
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Higher
                  </button>
                  <button
                    onClick={() => onPositionChange(-1, -2)}
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Left
                  </button>
                  <button
                    onClick={() => onPositionChange(1, -2)}
                    className="px-3 py-2 text-sm bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Right
                  </button>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>

              {/* Instructions */}
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium mb-1">Mixamo Character Tips:</p>
                <ul className="space-y-1">
                  <li>• Use X to move left/right</li>
                  <li>• Use Y to move up/down</li>
                  <li>• Character includes full body animations</li>
                  <li>• Speaking triggers jaw, hand & body movement</li>
                  <li>• Idle animations play automatically</li>
                  <li>• Use Cmd/Ctrl + Arrow keys for fine tuning</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  );
}
