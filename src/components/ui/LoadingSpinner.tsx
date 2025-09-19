// Loading Spinner Component
// Shows different loading states for various operations

import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  message?: string;
  type?: "primary" | "secondary" | "success" | "warning" | "error";
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  message,
  type = "primary",
}) => {
  const sizeClasses = {
    small: "w-4 h-4",
    medium: "w-8 h-8",
    large: "w-12 h-12",
  };

  const colorClasses = {
    primary: "border-blue-500",
    secondary: "border-gray-500",
    success: "border-green-500",
    warning: "border-yellow-500",
    error: "border-red-500",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`
          ${sizeClasses[size]} 
          ${colorClasses[type]}
          border-2 border-t-transparent 
          rounded-full 
          animate-spin
        `}
      />
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
};

// Inline loading indicator for buttons and small components
export const InlineLoader: React.FC<{ size?: "small" | "medium" }> = ({
  size = "small",
}) => {
  const sizeClass = size === "small" ? "w-3 h-3" : "w-4 h-4";

  return (
    <div
      className={`
        ${sizeClass}
        border border-current border-t-transparent 
        rounded-full 
        animate-spin
        inline-block
      `}
    />
  );
};

// Loading overlay for full screen or container loading
export const LoadingOverlay: React.FC<{
  isVisible: boolean;
  message?: string;
  children?: React.ReactNode;
}> = ({ isVisible, message = "Loading...", children }) => {
  if (!isVisible) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children && (
        <div className="opacity-50 pointer-events-none">{children}</div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
        <div className="text-center">
          <LoadingSpinner size="large" message={message} />
        </div>
      </div>
    </div>
  );
};

// Loading state for different operations
export const OperationLoader: React.FC<{
  operation:
    | "fetchingCards"
    | "savingProgress"
    | "creatingCard"
    | "deletingCard"
    | "migrating";
  isLoading: boolean;
  size?: "small" | "medium" | "large";
}> = ({ operation, isLoading, size = "medium" }) => {
  if (!isLoading) return null;

  const messages = {
    fetchingCards: "Loading your flashcards...",
    savingProgress: "Saving your progress...",
    creatingCard: "Creating flashcard...",
    deletingCard: "Deleting flashcard...",
    migrating: "Migrating your data...",
  };

  const types = {
    fetchingCards: "primary" as const,
    savingProgress: "success" as const,
    creatingCard: "primary" as const,
    deletingCard: "warning" as const,
    migrating: "secondary" as const,
  };

  return (
    <LoadingSpinner
      size={size}
      message={messages[operation]}
      type={types[operation]}
    />
  );
};

export default LoadingSpinner;
