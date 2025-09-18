// Completion component - shown when review session is finished
// Displays session results and provides options to continue or return to dashboard

import React from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';

type AppRoute = 'dashboard' | 'review' | 'complete';

interface CompletionProps {
  onNavigate: (route: AppRoute) => void;
}

const Completion: React.FC<CompletionProps> = ({ onNavigate }) => {
  const { state, resetSession, startReviewSession } = useFlashcard();

  // Show loading while we wait for session state to stabilize
  if (!state.currentSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // Redirect if no completed session
  if (!state.currentSession.isComplete) {
    console.log('Session not complete, redirecting to dashboard');
    onNavigate('dashboard');
    return null;
  }

  const { currentSession } = state;
  
  // Calculate accuracy based on Easy responses vs total unique cards reviewed
  const accuracy = currentSession.reviewedCards > 0 
    ? Math.round((currentSession.easyCount / currentSession.reviewedCards) * 100)
    : 0;

  const handleReturnToDashboard = () => {
    resetSession();
    onNavigate('dashboard');
  };

  const handleReviewAgain = () => {
    if (state.stats.dueCards > 0) {
      resetSession();
      startReviewSession();
      onNavigate('review');
    } else {
      handleReturnToDashboard();
    }
  };

  // Determine celebration message based on performance
  const getCelebrationMessage = () => {
    if (accuracy >= 90) {
      return { emoji: "🌟", message: "Outstanding!", subtext: "You're a vocabulary superstar!" };
    } else if (accuracy >= 75) {
      return { emoji: "🎉", message: "Great job!", subtext: "You're making excellent progress!" };
    } else if (accuracy >= 50) {
      return { emoji: "👍", message: "Good work!", subtext: "Keep practicing and you'll improve!" };
    } else {
      return { emoji: "💪", message: "Keep trying!", subtext: "Every practice session makes you stronger!" };
    }
  };

  const celebration = getCelebrationMessage();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      <div className="max-w-md w-full">
        {/* Celebration header */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4 animate-bounce-slow">
            {celebration.emoji}
          </div>
          <h1 className="text-4xl font-bold font-child text-primary-600 mb-2">
            {celebration.message}
          </h1>
          <p className="text-lg font-rounded text-gray-600">
            {celebration.subtext}
          </p>
        </div>

        {/* Results card */}
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-white p-8 mb-8">
          <div className="text-center space-y-6">
            {/* Main stats */}
            <div className="grid grid-cols-2 gap-6">
              {/* Cards reviewed */}
              <div>
                <div className="text-3xl font-bold font-child text-primary-600">
                  {currentSession.reviewedCards}
                </div>
                <div className="text-sm font-rounded text-gray-500">
                  Cards Reviewed
                </div>
              </div>

              {/* Accuracy */}
              <div>
                <div className="text-3xl font-bold font-child text-success-600">
                  {accuracy}%
                </div>
                <div className="text-sm font-rounded text-gray-500">
                  Accuracy
                </div>
              </div>
            </div>

            {/* Detailed breakdown */}
            <div className="border-t border-gray-200 pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold font-child text-success-600">
                    {currentSession.easyCount}
                  </div>
                  <div className="text-xs font-rounded text-gray-500">
                    Easy
                  </div>
                </div>
                
                <div>
                  <div className="text-xl font-bold font-child text-warning-600">
                    {currentSession.hardCount}
                  </div>
                  <div className="text-xs font-rounded text-gray-500">
                    Hard
                  </div>
                </div>
                
                <div>
                  <div className="text-xl font-bold font-child text-primary-600">
                    {currentSession.reviewedCards}
                  </div>
                  <div className="text-xs font-rounded text-gray-500">
                    Reviewed
                  </div>
                </div>
              </div>
            </div>

            {/* Session duration */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-sm font-rounded text-gray-500">
                Session completed in{' '}
                <span className="font-semibold text-gray-700">
                  {Math.round((Date.now() - currentSession.startTime.getTime()) / 1000 / 60)} minutes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-4">
          {/* Continue/Review again button */}
          {state.stats.dueCards > 0 ? (
            <button
              onClick={handleReviewAgain}
              className="
                w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white 
                rounded-2xl font-bold font-child text-lg shadow-lg
                hover:from-primary-600 hover:to-primary-700 
                transform hover:scale-105 active:scale-95 transition-all duration-200
              "
            >
              🔄 Review More Cards ({state.stats.dueCards} left)
            </button>
          ) : (
            <div className="text-center p-4 bg-success-50 rounded-2xl border border-success-200">
              <div className="text-lg font-bold font-child text-success-600 mb-1">
                🎉 All Done for Today!
              </div>
              <div className="text-sm font-rounded text-success-600">
                Come back tomorrow for more practice
              </div>
            </div>
          )}

          {/* Return to dashboard */}
          <button
            onClick={handleReturnToDashboard}
            className="
              w-full py-3 px-6 bg-white border-2 border-gray-300 text-gray-600 
              rounded-2xl font-rounded text-sm shadow-sm
              hover:border-gray-400 hover:text-gray-700 transition-colors duration-200
            "
          >
            📊 Back to Dashboard
          </button>
        </div>

        {/* Encouragement message */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200">
          <div className="text-center">
            <div className="text-sm font-rounded text-blue-600 font-semibold">
              💡 Learning Tip
            </div>
            <div className="text-xs font-rounded text-blue-500 mt-1">
              Regular practice is the key to mastering vocabulary. 
              Even 5 minutes a day makes a big difference!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Completion;