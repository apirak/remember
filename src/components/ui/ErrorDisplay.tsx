// Error Display Component
// Shows error messages with retry functionality

import React from "react";
import type { AppError } from "../../types/flashcard";

interface ErrorDisplayProps {
  error: AppError | null;
  onRetry?: () => void;
  onClear?: () => void;
  showDetails?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onClear,
  showDetails = false,
  className = "",
}) => {
  if (!error) return null;

  const getErrorIcon = (code: string) => {
    switch (code) {
      case "NETWORK_ERROR":
        return "📡";
      case "AUTH_ERROR":
        return "🔐";
      case "PERMISSION_ERROR":
        return "🚫";
      case "FIRESTORE_ERROR":
        return "💾";
      default:
        return "⚠️";
    }
  };

  const getErrorColor = (code: string) => {
    switch (code) {
      case "NETWORK_ERROR":
        return "border-orange-300 bg-orange-50 text-orange-800";
      case "AUTH_ERROR":
        return "border-red-300 bg-red-50 text-red-800";
      case "PERMISSION_ERROR":
        return "border-red-300 bg-red-50 text-red-800";
      case "FIRESTORE_ERROR":
        return "border-blue-300 bg-blue-50 text-blue-800";
      default:
        return "border-gray-300 bg-gray-50 text-gray-800";
    }
  };

  return (
    <div
      className={`
      border rounded-lg p-4 mb-4 
      ${getErrorColor(error.code)} 
      ${className}
    `}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0" role="img" aria-label="Error">
          {getErrorIcon(error.code)}
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium mb-1">Something went wrong</h3>

          <p className="text-sm mb-3">{error.message}</p>

          {showDetails && (
            <details className="text-xs opacity-75 mb-3">
              <summary className="cursor-pointer hover:opacity-100">
                Error Details
              </summary>
              <div className="mt-2 p-2 bg-black bg-opacity-10 rounded">
                <p>
                  <strong>Code:</strong> {error.code}
                </p>
                <p>
                  <strong>Time:</strong> {error.timestamp.toLocaleString()}
                </p>
                {error.context && (
                  <p>
                    <strong>Context:</strong>{" "}
                    {JSON.stringify(error.context, null, 2)}
                  </p>
                )}
              </div>
            </details>
          )}

          <div className="flex gap-2">
            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="
                  px-3 py-1 
                  bg-white bg-opacity-50 
                  hover:bg-opacity-75 
                  border border-current 
                  rounded 
                  text-sm 
                  transition-all
                  focus:outline-none focus:ring-2 focus:ring-offset-1
                "
              >
                🔄 Try Again
              </button>
            )}

            {onClear && (
              <button
                onClick={onClear}
                className="
                  px-3 py-1 
                  bg-white bg-opacity-50 
                  hover:bg-opacity-75 
                  border border-current 
                  rounded 
                  text-sm 
                  transition-all
                  focus:outline-none focus:ring-2 focus:ring-offset-1
                "
              >
                ✕ Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Inline error for form fields and smaller components
export const InlineError: React.FC<{
  message: string;
  className?: string;
}> = ({ message, className = "" }) => {
  return (
    <div
      className={`flex items-center gap-1 text-red-600 text-sm ${className}`}
    >
      <span className="text-xs">⚠️</span>
      <span>{message}</span>
    </div>
  );
};

// Error boundary fallback component
export const ErrorFallback: React.FC<{
  error: Error;
  resetErrorBoundary: () => void;
}> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          error={{
            code: "COMPONENT_ERROR",
            message: "Something went wrong in the application.",
            retryable: true,
            timestamp: new Date(),
            context: { errorMessage: error.message },
          }}
          onRetry={resetErrorBoundary}
          showDetails={true}
          className="shadow-lg"
        />
      </div>
    </div>
  );
};

// Connection status indicator
export const ConnectionStatus: React.FC<{
  status: "idle" | "syncing" | "error" | "offline";
  className?: string;
}> = ({ status, className = "" }) => {
  const statusConfig = {
    idle: { color: "text-green-600", icon: "✅", text: "Connected" },
    syncing: { color: "text-blue-600", icon: "🔄", text: "Syncing..." },
    error: { color: "text-red-600", icon: "❌", text: "Sync Error" },
    offline: { color: "text-gray-600", icon: "📴", text: "Offline" },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`flex items-center gap-1 text-xs ${config.color} ${className}`}
    >
      <span className={status === "syncing" ? "animate-spin" : ""}>
        {config.icon}
      </span>
      <span>{config.text}</span>
    </div>
  );
};

export default ErrorDisplay;
