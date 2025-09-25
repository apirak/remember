// Dashboard component - main landing screen with statistics and start review button
// Shows progress stats and provides navigation to begin reviewing flashcards

import React from 'react';
import {
  MAX_REVIEW_CARDS,
  useFlashcard,
} from '../../contexts/FlashcardContext';
import LoginButton from '../auth/LoginButton';
import EmojiText from '../EmojiSVG';

type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets';

interface DashboardProps {
  onNavigate: (route: AppRoute) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { state, startReviewSession, resetTodayProgress, clearError } =
    useFlashcard();

  const handleStartReview = () => {
    console.log('Dashboard: Start Review button clicked', {
      dueCards: state.stats.dueCards,
      isLoading: state.isLoading,
    });
    if (state.stats.dueCards > 0 && !state.isLoading) {
      startReviewSession();
      onNavigate('review');
    }
  };

  const handleResetProgress = async () => {
    console.log('Dashboard: Reset Progress button clicked');
    try {
      await resetTodayProgress();
      console.log('Dashboard: Reset Progress completed successfully');
    } catch (error) {
      console.error('Failed to reset progress:', error);
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
      {/* Main content - now full width */}
      <div className="w-full flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-5 rounded-3xl shadow-lg">
          {/* Enhanced Error Display with specific error handling */}
          {state.error && (
            <div className="mb-2 p-4 bg-red-50 border border-red-200 rounded-2xl">
              <div className="flex items-center">
                <div className="text-red-500 mr-2">
                  {/* Show different icons based on error type */}
                  {state.error.code.includes('CARD_SET')
                    ? '📚'
                    : state.error.code.includes('NETWORK')
                      ? '🌐'
                      : state.error.code.includes('FIRESTORE')
                        ? '☁️'
                        : '⚠️'}
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
                {state.error.retryable && state.selectedCardSet?.dataFile && (
                  <button
                    onClick={() => {
                      clearError();
                      // Retry loading the current card set
                      if (state.selectedCardSet?.dataFile) {
                        console.log('Dashboard: Retrying card set load');
                        // The loadCardSetData function will be triggered by the useEffect
                        // when selectedCardSet changes or when manually called
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

          {/* Top Navigation - All Sets (Left) and Share (Right) */}
          <div className="flex justify-between items-center mb-2">
            {/* All Sets Navigation Button - Top Left */}
            <button
              onClick={() => {
                console.log('Dashboard: All Sets button clicked');
                onNavigate('card-sets');
              }}
              className="flex py-1 px-2 items-center text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              <EmojiText size={12}>📚</EmojiText>&nbsp;
              <span>All Sets</span>
            </button>

            {/* Share Button - Top Right */}
            <button
              onClick={(event) => {
                const cardSetName = state.selectedCardSet?.name || 'Flashcards';
                const cardSetId = state.selectedCardSet?.id;

                // Build the shareable URL with card set path
                let shareUrl = window.location.origin;
                if (cardSetId) {
                  shareUrl += `/${cardSetId}`;
                } else {
                  // Fallback to current URL if no card set ID
                  shareUrl = window.location.href;
                }

                // Check if it's a desktop/laptop (screen width > 768px or no touch support)
                const isDesktop =
                  window.innerWidth > 768 || !('ontouchstart' in window);

                if (navigator.share && !isDesktop) {
                  // Use native share API only on mobile/tablet
                  navigator
                    .share({
                      title: `${cardSetName} - Smart Flashcards`,
                      text: `Check out this flashcard set: ${cardSetName}`,
                      url: shareUrl,
                    })
                    .catch((error) => {
                      console.log('Error sharing:', error);
                    });
                } else {
                  // Always use clipboard copy on desktop, or as fallback
                  navigator.clipboard
                    .writeText(shareUrl)
                    .then(() => {
                      // Show a temporary notification
                      const button = event.target as HTMLElement;
                      const originalText = button.textContent;
                      button.textContent = '✓ Copied!';
                      setTimeout(() => {
                        button.textContent = originalText;
                      }, 2000);
                    })
                    .catch((error) => {
                      console.log('Error copying to clipboard:', error);
                    });
                }
              }}
              className="flex py-1 px-2 items-center text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              title="Share this card set"
            >
              <EmojiText size={12}>🔗</EmojiText>&nbsp;
              <span>Share</span>
            </button>
          </div>

          {/* Header */}
          <div className="text-center mb-5 mt-2">
            <EmojiText size={64} className="p-4">
              {state.selectedCardSet?.cover || '🎓'}
            </EmojiText>
            <h1 className="text-3xl font-child text-gray-600 mb-2">
              {state.selectedCardSet?.name || 'Flashcards'}
            </h1>
            <p className="text-sm font-rounded text-gray-600">
              {state.selectedCardSet?.description }
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
              disabled={state.stats.dueCards === 0 || state.isLoading}
              className={`
                w-full py-3 rounded-2xl font-bold font-child text-3xl 
                transform transition-all duration-200
                ${
                  state.stats.dueCards > 0 && !state.isLoading
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white hover:scale-[102%] hover:shadow-2xl hover:shadow-primary-500/30 active:scale-95 active:shadow-lg active:shadow-primary-500/20'
                    : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                }
              `}
            >
              {state.isLoading ? (
                <div className="flex items-center justify-center">
                  <span>Loading cards...</span>
                </div>
              ) : state.stats.dueCards > 0 ? (
                <div className="flex items-center justify-center">
                  <span>Start Review</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span>🎉 Done! See you tomorrow</span>
                </div>
              )}
            </button>

            <div className="flex flex-col">
              {!state.isLoading && state.stats.dueCards > 0 ? (
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
                    ? 'bg-transparent text-gray-300 cursor-not-allowed'
                    : 'bg-transparent text-gray-400 hover:text-gray-500'
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
      </div>
    </div>
  );
};

export default Dashboard;
