// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from "react";
import { useFlashcard } from "../../contexts/FlashcardContext";
import LoginButton from "../auth/LoginButton";

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
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Total Cards */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-primary-100">
            <div className="text-center">
              <div className="text-2xl mb-1">📚</div>
              <div className="text-2xl font-bold font-child text-primary-600">
                {state.stats.totalCards}
              </div>
              <div className="text-sm font-rounded text-gray-500">
                Total Cards
              </div>
            </div>
          </div>

          {/* Mastered Cards */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-success-100">
            <div className="text-center">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-2xl font-bold font-child text-success-600">
                {state.stats.masteredCards}
              </div>
              <div className="text-sm font-rounded text-gray-500">Mastered</div>
            </div>
          </div>

          {/* Need Practice Cards */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-warning-100">
            <div className="text-center">
              <div className="text-2xl mb-1">🤔</div>
              <div className="text-2xl font-bold font-child text-warning-600">
                {state.stats.difficultCards}
              </div>
              <div className="text-sm font-rounded text-gray-500">
                Need Practice
              </div>
            </div>
          </div>

          {/* Review Today */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-secondary-100">
            <div className="text-center">
              <div className="text-2xl mb-1">💪</div>
              <div className="text-2xl font-bold font-child text-secondary-600">
                {state.stats.reviewsToday}
              </div>
              <div className="text-sm font-rounded text-gray-500">
                Review Today
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Start Review Button */}
          <button
            onClick={handleStartReview}
            disabled={state.stats.dueCards === 0}
            className={`
              w-full py-4 px-6 rounded-2xl font-bold font-child text-lg shadow-lg transform transition-all duration-200
              ${
                state.stats.dueCards > 0
                  ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:scale-105 active:scale-95"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {state.stats.dueCards > 0 ? (
              <>
                🚀 Start Review ({Math.min(state.stats.dueCards, 20)}
                {state.stats.dueCards > 20
                  ? ` of ${state.stats.dueCards}`
                  : ""}{" "}
                cards)
              </>
            ) : (
              <>🎉 All Done! Come back tomorrow</>
            )}
          </button>

          {/* Reset Progress Button */}
          <button
            onClick={handleResetProgress}
            disabled={state.loadingStates.savingProgress}
            className={`
              w-full py-3 px-6 rounded-2xl font-rounded text-sm border-2 transition-colors duration-200
              bg-white shadow-sm
              ${
                state.loadingStates.savingProgress
                  ? "border-gray-200 text-gray-400 cursor-not-allowed"
                  : "border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700"
              }
            `}
          >
            {state.loadingStates.savingProgress ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                Resetting...
              </span>
            ) : (
              "🔄 Reset Today's Progress"
            )}
          </button>

          {/* Login Section */}
          <div className="mt-4">
            <LoginButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
