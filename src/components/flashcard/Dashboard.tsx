// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from "react";
import {
  MAX_REVIEW_CARDS,
  useFlashcard,
} from "../../contexts/FlashcardContext";
import LoginButton from "../auth/LoginButton";
import EmojiText from "../EmojiSVG";
import { DebugPanel } from "../ui/DebugPanel";

type AppRoute = "dashboard" | "review" | "complete" | "card-sets";

interface DashboardProps {
  onNavigate: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { state, startReviewSession, resetTodayProgress, clearError } =
    useFlashcard();

  const handleStartReview = () => {
    console.log("Dashboard: Start Review button clicked", {
      dueCards: state.stats.dueCards,
    });
    if (state.stats.dueCards > 0) {
      startReviewSession();
      onNavigate("review");
    }
  };

  const handleResetProgress = async () => {
    console.log("Dashboard: Reset Progress button clicked");
    try {
      await resetTodayProgress();
      console.log("Dashboard: Reset Progress completed successfully");
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
    <div className="min-h-screen flex">
      {/* Left half - Main content */}
      <div className="w-1/2 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-lg">
          {/* Enhanced Error Display with specific error handling */}
          {state.error && (
            <div className="mb-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">
                  {/* Show different icons based on error type */}
                  {state.error.code.includes("CARD_SET")
                    ? "📚"
                    : state.error.code.includes("NETWORK")
                    ? "🌐"
                    : state.error.code.includes("FIRESTORE")
                    ? "☁️"
                    : "⚠️"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-red-700 font-medium">
                    {state.error.message}
                  </p>
                  {/* Show additional context for development/debugging */}
                  {state.error.context?.cardSetId && (
                    <p className="text-xs text-red-600 mt-1">
                      Card Set: {state.error.context.cardSetId}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                {/* Dismiss button */}
                <button
                  onClick={() => clearError()}
                  className="text-xs text-red-600 hover:text-red-800 underline"
                >
                  Dismiss
                </button>

                {/* Retry button for retryable errors */}
                {state.error.retryable && state.currentCardSet?.dataFile && (
                  <button
                    onClick={() => {
                      clearError();
                      // Retry loading the current card set
                      if (state.currentCardSet?.dataFile) {
                        console.log("Dashboard: Retrying card set load");
                        // The loadCardSetData function will be triggered by the useEffect
                        // when currentCardSet changes or when manually called
                      }
                    }}
                    className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded transition-colors duration-200"
                  >
                    Try Again
                  </button>
                )}
              </div>
            </div>
          )}

          {/* All Sets Navigation Button - Top Left */}
          <div>
            <button
              onClick={() => {
                console.log("Dashboard: All Sets button clicked");
                onNavigate("card-sets");
              }}
              className="flex py-1 px-2 items-center text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              <EmojiText size={12}>📚</EmojiText>&nbsp;
              <span>All Sets</span>
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-5 mt-2">
            <EmojiText size={64} className="p-4">
              {state.currentCardSet?.cover || "🎓"}
            </EmojiText>
            <h1 className="text-3xl font-child text-gray-600 mb-2">
              {state.currentCardSet?.name || "Flashcards"}
            </h1>
            <p className="text-sm font-rounded text-gray-600">
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
          <div className="mb-5">
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
                <div className="text-xs font-rounded text-gray-600">
                  Mastered
                </div>
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
        <div className="mt-2">
          <LoginButton />
        </div>
      </div>

      {/* Right half - Debug Panel */}
      <div className="w-1/2">
        <DebugPanel />
      </div>
    </div>
  );
};

export default Dashboard;
