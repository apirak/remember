// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';

type AppRoute = 'dashboard' | 'review' | 'complete';

interface DashboardProps {
  onNavigate: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { state, startReviewSession, resetTodayProgress } = useFlashcard();

  const handleStartReview = () => {
    if (state.stats.dueCards > 0) {
      startReviewSession();
      onNavigate('review');
    }
  };

  const handleResetProgress = () => {
    resetTodayProgress();
  };

  // Show loading state while cards are loading
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
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
              <div className="text-sm font-rounded text-gray-500">Total Cards</div>
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
              <div className="text-sm font-rounded text-gray-500">Need Practice</div>
            </div>
          </div>

          {/* Review Today */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-secondary-100">
            <div className="text-center">
              <div className="text-2xl mb-1">⏰</div>
              <div className="text-2xl font-bold font-child text-secondary-600">
                {state.stats.dueCards}
              </div>
              <div className="text-sm font-rounded text-gray-500">Review Today</div>
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
              ${state.stats.dueCards > 0 
                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:from-primary-600 hover:to-primary-700 hover:scale-105 active:scale-95'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {state.stats.dueCards > 0 ? (
              <>
                🚀 Start Review ({Math.min(state.stats.dueCards, 20)}{state.stats.dueCards > 20 ? ` of ${state.stats.dueCards}` : ''} cards)
              </>
            ) : (
              <>
                🎉 All Done! Come back tomorrow
              </>
            )}
          </button>

          {/* Reset Progress Button */}
          <button
            onClick={handleResetProgress}
            className="
              w-full py-3 px-6 rounded-2xl font-rounded text-sm border-2 border-gray-300 text-gray-600 
              hover:border-gray-400 hover:text-gray-700 transition-colors duration-200
              bg-white shadow-sm
            "
          >
            🔄 Reset Today's Progress
          </button>
        </div>

        {/* Progress Summary */}
        {state.stats.reviewsToday > 0 && (
          <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-rounded text-gray-500 mb-1">
                Reviews Today
              </div>
              <div className="text-xl font-bold font-child text-primary-600">
                {state.stats.reviewsToday}
              </div>
            </div>
          </div>
        )}

        {/* Guest Mode Notice */}
        <div className="mt-6 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <div className="text-center">
            <div className="text-sm font-rounded text-blue-600">
              👤 Guest Mode: Your progress won't be saved
            </div>
            <div className="text-xs font-rounded text-blue-500 mt-1">
              Sign up to save your learning progress!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;