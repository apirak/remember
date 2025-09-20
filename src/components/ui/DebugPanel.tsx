// Debug Panel Component
// Shows debugging information in development mode only

import React, { useState } from "react";
import { useFlashcard } from "../../contexts/FlashcardContext";
import {
  calculateReviewsToday,
  isCardReviewedToday,
} from "../../utils/flashcardHelpers";
import type { Flashcard } from "../../types/flashcard";

export const DebugPanel: React.FC = () => {
  const { state } = useFlashcard();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const currentDate = new Date();
  const reviewedTodayCards = state.allCards.filter((card: Flashcard) =>
    isCardReviewedToday(card, currentDate)
  );

  const debugInfo = {
    currentDate: currentDate.toDateString(),
    totalCards: state.allCards.length,
    reviewsToday: calculateReviewsToday(state.allCards),
    statsReviewsToday: state.stats.reviewsToday,
    dataSource: state.dataSource,
    isGuest: state.isGuest,
    syncStatus: state.syncStatus,
    sampleCards: state.allCards.slice(0, 3).map((card: Flashcard) => ({
      id: card.id,
      lastReviewDate: card.lastReviewDate,
      lastReviewDateType: typeof card.lastReviewDate,
      lastReviewDateString:
        card.lastReviewDate instanceof Date
          ? card.lastReviewDate.toDateString()
          : String(card.lastReviewDate),
      isReviewedToday: isCardReviewedToday(card, currentDate),
    })),
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg"
      >
        🐛 Debug {isExpanded ? "▼" : "▲"}
      </button>

      {isExpanded && (
        <div className="absolute bottom-12 right-0 bg-gray-900 text-green-400 p-4 rounded-lg shadow-xl max-w-md text-xs font-mono max-h-96 overflow-y-auto">
          <h3 className="text-yellow-400 font-bold mb-2">🔍 Debug Info</h3>

          <div className="space-y-2">
            <div>
              <span className="text-blue-400">Current Date:</span>{" "}
              {debugInfo.currentDate}
            </div>
            <div>
              <span className="text-blue-400">Total Cards:</span>{" "}
              {debugInfo.totalCards}
            </div>
            <div>
              <span className="text-blue-400">Reviews Today (calc):</span>{" "}
              {debugInfo.reviewsToday}
            </div>
            <div>
              <span className="text-blue-400">Reviews Today (stats):</span>{" "}
              {debugInfo.statsReviewsToday}
            </div>
            <div>
              <span className="text-blue-400">Data Source:</span>{" "}
              {debugInfo.dataSource}
            </div>
            <div>
              <span className="text-blue-400">Is Guest:</span>{" "}
              {debugInfo.isGuest.toString()}
            </div>
            <div>
              <span className="text-blue-400">Sync Status:</span>{" "}
              {debugInfo.syncStatus}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="text-yellow-400 font-bold">
              📋 Reviewed Today Cards:
            </h4>
            <div className="text-xs">
              {reviewedTodayCards.length === 0 ? (
                <div className="text-red-400">No cards reviewed today</div>
              ) : (
                reviewedTodayCards.slice(0, 5).map((card: Flashcard) => (
                  <div key={card.id} className="text-green-300">
                    {card.id}:{" "}
                    {card.lastReviewDate instanceof Date
                      ? card.lastReviewDate.toDateString()
                      : "Invalid Date"}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="text-yellow-400 font-bold">🔬 Sample Cards Data:</h4>
            <div className="text-xs space-y-1">
              {debugInfo.sampleCards.map((card: any, idx: number) => (
                <div key={idx} className="bg-gray-800 p-2 rounded">
                  <div>
                    <span className="text-blue-400">ID:</span> {card.id}
                  </div>
                  <div>
                    <span className="text-blue-400">Type:</span>{" "}
                    {card.lastReviewDateType}
                  </div>
                  <div>
                    <span className="text-blue-400">Date:</span>{" "}
                    {card.lastReviewDateString}
                  </div>
                  <div>
                    <span className="text-blue-400">Today?:</span>
                    <span
                      className={
                        card.isReviewedToday ? "text-green-400" : "text-red-400"
                      }
                    >
                      {card.isReviewedToday.toString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
