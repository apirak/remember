// Review component - main flashcard review interface
// Handles showing cards, flipping to back, and rating responses

import React, { useEffect, useState } from "react";
import { useFlashcard } from "../../contexts/FlashcardContext";
import { QUALITY_RATINGS } from "../../utils/sm2";

type AppRoute = "dashboard" | "review" | "complete";

interface ReviewProps {
  onNavigate: (route: AppRoute) => void;
}

const Review: React.FC<ReviewProps> = ({ onNavigate }) => {
  const {
    state,
    showCardBack,
    rateCard,
    knowCard,
    resetSession,
    updateCurrentCardSetProgress,
  } = useFlashcard();
  const [isFlipping, setIsFlipping] = useState(false);

  // All hooks must be called before any conditional returns
  // Reset flip animation when card changes
  useEffect(() => {
    if (state.currentCard?.id) {
      setIsFlipping(false);
    }
  }, [state.currentCard?.id]);

  // Handle "I Know" button
  const handleKnowCard = () => {
    knowCard();
    setIsFlipping(false); // Reset flip state for next card
  };

  // Handle back to dashboard - reset session first and update progress
  const handleBackToDashboard = async () => {
    // Update progress before leaving review
    if (!state.isGuest && state.currentSession) {
      console.log(
        "Review: Updating card set progress before returning to dashboard"
      );
      try {
        await updateCurrentCardSetProgress();
      } catch (error) {
        console.error("Review: Failed to update progress:", error);
      }
    }

    resetSession();
    onNavigate("dashboard");
  };

  // Handle card flip animation
  const handleShowCard = () => {
    setIsFlipping(true);
    // Add a slight delay before showing the back to make the flip visible
    setTimeout(() => {
      showCardBack();
    }, 300); // Half of the animation duration
  };

  // Handle rating selection
  const handleRating = (quality: number) => {
    rateCard(quality);
    setIsFlipping(false); // Reset flip state for next card
  };

  // Show loading or redirect if no session
  if (!state.currentSession || !state.currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading review...
          </p>
        </div>
      </div>
    );
  }

  // Validate card-to-cardset consistency
  // Ensure current card belongs to the session cards (which should match current card set)
  const isCardValid = state.currentSession.cards.some(
    (sessionCard) => sessionCard.id === state.currentCard?.id
  );

  if (!isCardValid) {
    console.warn(
      "Review: Card validation failed - current card doesn't belong to session cards",
      {
        currentCardId: state.currentCard.id,
        sessionCardIds: state.currentSession.cards.map((c) => c.id),
        currentCardSet: state.currentCardSet?.name,
      }
    );

    // Reset session and redirect to dashboard for safety
    // This prevents showing cards from wrong card sets
    resetSession();
    onNavigate("dashboard");

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-lg font-rounded text-gray-600 mb-4">
            Card set mismatch detected. Returning to dashboard...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  const { currentSession, currentCard, isShowingBack } = state;
  const progress =
    (currentSession.reviewedCards / currentSession.totalCards) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      {/* Header with progress */}
      <div className="p-4 bg-white shadow-sm">
        <div className="max-w-md mx-auto">
          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-sm font-rounded text-gray-600 mb-1">
              <span>Progress</span>
              <span>
                {currentSession.reviewedCards} / {currentSession.totalCards}{" "}
                completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Session stats */}
          <div className="flex justify-between text-sm font-rounded text-gray-500">
            <span>Reviewed: {currentSession.reviewedCards}</span>
            <span>
              Easy: {currentSession.easyCount} | Hard:{" "}
              {currentSession.hardCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Flashcard */}
          <div
            className={`flashcard-flip ${
              isShowingBack || isFlipping ? "flipped" : ""
            } mb-8 min-h-[300px]`}
          >
            <div className="flashcard-inner">
              {/* Front of card */}
              <div className="flashcard-front bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden flex flex-col justify-center items-center text-center p-8">
                <div className="space-y-4">
                  <div className="text-6xl font-bold text-gray-800 mb-2">
                    {currentCard.front.title}
                  </div>
                  <div className="text-2xl font-rounded text-primary-600">
                    {currentCard.front.description}
                  </div>
                  {currentCard.front.icon && (
                    <div className="text-4xl mt-4">
                      {currentCard.front.icon}
                    </div>
                  )}
                </div>
              </div>

              {/* Back of card */}
              <div className="flashcard-back bg-white rounded-3xl shadow-2xl border-4 border-white overflow-hidden flex flex-col justify-center items-center text-center p-8">
                <div className="space-y-4">
                  <div className="text-4xl mb-2">{currentCard.back.icon}</div>
                  <div className="text-3xl font-bold font-child text-success-600 mb-2">
                    {currentCard.back.title}
                  </div>
                  <div className="text-lg font-rounded text-gray-600">
                    {currentCard.back.description}
                  </div>

                  {/* Show original on back too */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm font-rounded text-gray-500 mb-1">
                      Original:
                    </div>
                    <div className="text-lg font-bold text-gray-700">
                      {currentCard.front.title} ({currentCard.front.description}
                      )
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {!isShowingBack ? (
              // Front side buttons
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleShowCard}
                  className="
                    py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white 
                    rounded-2xl font-bold font-child text-lg shadow-lg
                    hover:from-blue-600 hover:to-blue-700 
                    transform hover:scale-105 active:scale-95 transition-all duration-200
                  "
                >
                  👀 Show Me
                </button>

                <button
                  onClick={handleKnowCard}
                  className="
                    py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white 
                    rounded-2xl font-bold font-child text-lg shadow-lg
                    hover:from-green-600 hover:to-green-700 
                    transform hover:scale-105 active:scale-95 transition-all duration-200
                  "
                >
                  ✅ I Know
                </button>
              </div>
            ) : (
              // Back side rating buttons
              <div className="space-y-3">
                <div className="text-center mb-4">
                  {/* <p className="text-lg font-rounded text-gray-600">How did you do?</p> */}
                </div>

                <div className="flex gap-4">
                  {/* Ask Me Again - Red */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.AGAIN)}
                    className="
                      w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white 
                      rounded-2xl font-bold font-child text-lg shadow-lg
                      hover:from-red-600 hover:to-red-700 
                      transform hover:scale-105 active:scale-95 transition-all duration-200
                      flex items-center justify-center space-x-2
                    "
                  >
                    <span>Hard</span>
                  </button>

                  {/* Hard - Orange */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.HARD)}
                    className="
                      w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 text-white 
                      rounded-2xl font-bold font-child text-lg shadow-lg
                      hover:from-orange-600 hover:to-orange-700 
                      transform hover:scale-105 active:scale-95 transition-all duration-200
                      flex items-center justify-center space-x-2
                    "
                  >
                    <span>Good</span>
                  </button>

                  {/* Got It - Green */}
                  <button
                    onClick={() => handleRating(QUALITY_RATINGS.GOOD)}
                    className="
                      w-full py-4 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white 
                      rounded-2xl font-bold font-child text-lg shadow-lg
                      hover:from-green-600 hover:to-green-700 
                      transform hover:scale-105 active:scale-95 transition-all duration-200
                      flex items-center justify-center space-x-2
                    "
                  >
                    <span>Easy</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Exit button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleBackToDashboard}
              className="
                py-2 px-4 text-gray-500 font-rounded text-sm
                hover:text-gray-700 transition-colors duration-200
              "
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Review;
