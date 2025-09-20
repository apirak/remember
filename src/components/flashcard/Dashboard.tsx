// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from "react";
import {
  MAX_REVIEW_CARDS,
  useFlashcard,
} from "../../contexts/FlashcardContext";
import LoginButton from "../auth/LoginButton";
import { DebugPanel } from "../ui/DebugPanel";
import EmojiText from "../EmojiSVG";

type AppRoute = "dashboard" | "review" | "complete";

interface DashboardProps {
  onNavigate: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { state, startReviewSession, resetTodayProgress, clearError } =
    useFlashcard();

  const handleStartReview = () => {
    if (state.stats.dueCards > 0) {
      startReviewSession();
      onNavigate("review");
    }
  };

  const handleResetProgress = async () => {
    try {
      await resetTodayProgress();
    } catch (error) {
      console.error("Failed to reset progress:", error);
      // You could add user-facing error handling here if needed
    }
  };

  // Show loading state while cards are loading
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading flashcards...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg">
        {/* Error Display */}
        {state.error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center">
              <div className="text-red-500 mr-2">⚠️</div>
              <p className="text-sm text-red-700">{state.error.message}</p>
            </div>
            {state.error.retryable && (
              <button
                onClick={() => clearError()}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            )}
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <EmojiText size={128}>🎓</EmojiText>
          <h1 className="mt-2 text-4xl font-child text-gray-600 mb-2">
            103 Everyday Chinese!
          </h1>
          <p className="text-md font-rounded text-gray-600">
            Remember Everything with <br />
            <a
              className="text-blue-600 hover:text-blue-800 no-underline"
              href="http://bit.ly/3KctaMk"
            >
              Smart Flashcards
            </a>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          {/* Supporting Stats */}
          <div className="grid grid-cols-3 gap-3 bg-white border border-gray-100 rounded-xl p-3">
            {/* Mastered Cards */}
            <div className="text-center">
              <div className="text-lg mb-1">
                <EmojiText size={32}>🏆</EmojiText>
              </div>
              <div className="text-2xl font-bold font-child text-success-600">
                {state.stats.masteredCards}
              </div>
              <div className="text-xs font-rounded text-gray-600">Mastered</div>
            </div>

            {/* Need Practice Cards */}
            <div className="text-center">
              <div className="text-lg mb-1">
                <EmojiText size={32}>⏲️</EmojiText>
              </div>
              <div className="text-2xl font-bold font-child text-warning-600">
                {state.stats.difficultCards}
              </div>
              <div className="text-xs font-rounded text-gray-600">
                Need Practice
              </div>
            </div>

            {/* Review Today */}
            <div className="text-center">
              <div className="text-lg mb-1">
                <EmojiText size={32}>️✅</EmojiText>
              </div>
              <div className="text-2xl font-bold font-child text-secondary-600">
                {state.stats.reviewsToday}
              </div>
              <div className="text-xs font-rounded text-gray-600">
                Reviewed Today
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          {/* Start Review Button */}
          <button
            onClick={handleStartReview}
            disabled={state.stats.dueCards === 0}
            className={`
                w-full py-3 px-8 rounded-2xl font-bold font-child text-3xl 
                transform transition-all duration-200
                ${
                  state.stats.dueCards > 0
                    ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:scale-[102%] hover:shadow-2xl hover:shadow-primary-500/30 active:scale-95 active:shadow-lg active:shadow-primary-500/20"
                    : "bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed"
                }
              `}
          >
            {state.stats.dueCards > 0 ? (
              <div className="flex items-center justify-center">
                <span>Start Review</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-2xl mr-3">🎉</span>
                <span>All Done! Come back tomorrow</span>
              </div>
            )}
          </button>

          <div className="flex flex-col">
            {state.stats.dueCards > 0 ? (
              <div className="w-full text-center text-md text-primary-900">
                {Math.min(state.stats.dueCards, MAX_REVIEW_CARDS)} cards ready
                for today. 🚀
              </div>
            ) : null}

            {/* Reset Progress Button */}
            <button
              onClick={handleResetProgress}
              disabled={state.loadingStates.savingProgress}
              className={`
                w-full font-rounded text-xs transition-colors duration-200
                py-2
                ${
                  state.loadingStates.savingProgress
                    ? "bg-transparent text-gray-300 cursor-not-allowed"
                    : "bg-transparent text-gray-400 hover:text-gray-500"
                }
              `}
            >
              {state.loadingStates.savingProgress ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-300 mr-1"></div>
                  Resetting...
                </span>
              ) : (
                "Reset Today's Progress"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Login Section */}
      <div className="mt-4">
        <LoginButton />
      </div>

      {/* Debug Panel - only shows in development */}
      <DebugPanel />
    </div>
  );
};

export default Dashboard;
