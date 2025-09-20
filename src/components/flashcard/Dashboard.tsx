// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from "react";
import { useFlashcard } from "../../contexts/FlashcardContext";
import LoginButton from "../auth/LoginButton";
import { DebugPanel } from "../ui/DebugPanel";

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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
          <h1 className="text-4xl font-bold font-child text-primary-600 mb-2">
            🎓 Learn Chinese!
          </h1>
          <p className="text-lg font-rounded text-gray-600">
            Practice vocabulary with fun flashcards
          </p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          {/* Total Cards - Main Focus */}
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-6 mb-3 border border-primary-200">
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <div className="text-4xl font-bold font-child text-primary-600">
                {state.stats.totalCards}
              </div>
              <div className="text-lg font-rounded text-primary-700">
                Total Cards
              </div>
            </div>
          </div>

          {/* Supporting Stats */}
          <div className="grid grid-cols-3 gap-3">
            {/* Mastered Cards */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-center">
                <div className="text-lg mb-1">🏆</div>
                <div className="text-lg font-bold font-child text-success-600">
                  {state.stats.masteredCards}
                </div>
                <div className="text-xs font-rounded text-gray-600">
                  Mastered
                </div>
              </div>
            </div>

            {/* Need Practice Cards */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-center">
                <div className="text-lg mb-1">🤔</div>
                <div className="text-lg font-bold font-child text-warning-600">
                  {state.stats.difficultCards}
                </div>
                <div className="text-xs font-rounded text-gray-600">
                  Need Practice
                </div>
              </div>
            </div>

            {/* Review Today */}
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <div className="text-center">
                <div className="text-lg mb-1">💪</div>
                <div className="text-lg font-bold font-child text-secondary-600">
                  {state.stats.reviewsToday}
                </div>
                <div className="text-xs font-rounded text-gray-600">Today</div>
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
                w-full py-4 px-8 rounded-2xl font-bold font-child text-3xl 
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
                <span className="text-2xl mr-3">🚀</span>
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
                {Math.min(state.stats.dueCards, 20)} cards ready for today.
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

          {/* Login Section */}
          <div className="mt-2">
            <LoginButton />
          </div>
        </div>
      </div>

      {/* Debug Panel - only shows in development */}
      <DebugPanel />
    </div>
  );
};

export default Dashboard;
