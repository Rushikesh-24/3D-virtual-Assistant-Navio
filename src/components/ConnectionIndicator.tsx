"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";

interface ConnectionStatus {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export default function ConnectionIndicator() {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        setStatus((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await fetch("http://localhost:11434/api/version", {
          method: "GET",
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          setStatus({
            isConnected: true,
            isLoading: false,
            error: null,
          });
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        setStatus({
          isConnected: false,
          isLoading: false,
          error: error instanceof Error ? error.message : "Connection failed",
        });
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (status.isLoading) {
      return (
        <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
      );
    }
    if (status.isConnected) {
      return <Wifi className="w-3 h-3 text-black" />;
    }
    return <WifiOff className="w-3 h-3 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (status.isLoading) return "border-gray-300 bg-gray-50";
    if (status.isConnected) return "border-gray-800 bg-black";
    return "border-gray-300 bg-gray-100";
  };

  const getStatusText = () => {
    if (status.isLoading) return "Connecting...";
    if (status.isConnected) return "Ollama Connected";
    return "Ollama Offline";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        fixed top-4 right-4 z-50
        flex items-center gap-2 px-3 py-2 rounded-lg border shadow-lg
        transition-all duration-300 ${getStatusColor()}
      `}
    >
      {getStatusIcon()}
      <span
        className={`text-xs font-medium ${
          status.isConnected ? "text-white" : "text-gray-700"
        }`}
      >
        {getStatusText()}
      </span>

      {status.error && !status.isConnected && (
        <div className="group relative">
          <AlertCircle className="w-3 h-3 text-yellow-400 cursor-help" />
          <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="font-medium text-yellow-400 mb-1">
              Connection Issue:
            </p>
            <p>{status.error}</p>
            <p className="mt-2 text-slate-400">
              Make sure Ollama is running:{" "}
              <code className="bg-slate-700 px-1 rounded">ollama serve</code>
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
