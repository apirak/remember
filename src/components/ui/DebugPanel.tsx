// Debug Panel Component
// Shows debugging information in development mode only
// Global overlay that can be toggled from any page

import React, { useState, useEffect } from "react";
import { useFlashcard } from "../../contexts/FlashcardContext";
import {
  calculateReviewsToday,
  isCardReviewedToday,
} from "../../utils/flashcardHelpers";
import type { Flashcard } from "../../types/flashcard";

interface DebugPanelProps {
  position?: "right" | "left" | "bottom";
  defaultVisible?: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  position = "right",
  defaultVisible = false,
}) => {
  const { state } = useFlashcard();
  const [isVisible, setIsVisible] = useState(defaultVisible);
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  // Keyboard shortcut to toggle debug panel (Ctrl/Cmd + D)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  if (!isVisible) {
    // Floating toggle button
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full shadow-lg transition-all duration-200"
        title="Toggle Debug Panel (Ctrl/Cmd + D)"
      >
        🐛
      </button>
    );
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
    currentCardSet: state.currentCardSet?.name || "None",
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

  // Determine panel positioning
  const panelClasses =
    position === "right"
      ? "fixed top-0 right-0 h-screen w-80"
      : position === "left"
      ? "fixed top-0 left-0 h-screen w-80"
      : "fixed bottom-0 left-0 right-0 h-64";

  return (
    <div
      className={`${panelClasses} bg-gray-900 text-green-400 z-40 shadow-2xl flex flex-col`}
    >
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between">
        <h2 className="text-sm font-mono font-bold">🐛 Debug Panel</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-75">Ctrl+D</span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded text-xs font-mono"
          >
            {isExpanded ? "▼" : "▲"}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="bg-purple-700 hover:bg-purple-800 text-white px-2 py-1 rounded text-xs font-mono ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* Always show basic info */}
        <div className="text-xs font-mono space-y-1">
          <div>
            <span className="text-blue-400">Card Set:</span>{" "}
            {debugInfo.currentCardSet}
          </div>
          <div>
            <span className="text-blue-400">Total Cards:</span>{" "}
            {debugInfo.totalCards}
          </div>
          <div>
            <span className="text-blue-400">Due Cards:</span>{" "}
            {state.stats.dueCards}
          </div>
          <div>
            <span className="text-blue-400">Reviews Today:</span>{" "}
            {debugInfo.statsReviewsToday}
          </div>
          <div>
            <span className="text-blue-400">Data Source:</span>{" "}
            {debugInfo.dataSource}
          </div>
          <div>
            <span className="text-blue-400">Sync Status:</span>{" "}
            {debugInfo.syncStatus}
          </div>
          <div>
            <span className="text-blue-400">User Type:</span>{" "}
            {debugInfo.isGuest ? "Guest" : "Authenticated"}
          </div>

          {/* Loading states */}
          {state.isLoading && (
            <div className="text-yellow-400">⏳ Loading...</div>
          )}
          {state.loadingStates.savingProgress && (
            <div className="text-yellow-400">💾 Saving progress...</div>
          )}
          {state.loadingStates.fetchingCards && (
            <div className="text-yellow-400">📚 Fetching cards...</div>
          )}

          {/* Current session info */}
          {state.currentSession && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-yellow-400 font-bold">
                📝 Current Session:
              </div>
              <div>Cards: {state.currentSession.cards.length}</div>
              <div>Index: {state.currentSession.currentIndex}</div>
              <div>Complete: {state.currentSession.isComplete.toString()}</div>
              <div>Reviewed: {state.currentSession.reviewedCards}</div>
              <div>Easy: {state.currentSession.easyCount}</div>
              <div>Hard: {state.currentSession.hardCount}</div>
              <div>Again: {state.currentSession.againCount}</div>
            </div>
          )}

          {/* Error display */}
          {state.error && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-red-400 font-bold">❌ Error:</div>
              <div className="text-red-300 text-xs">{state.error.message}</div>
            </div>
          )}
        </div>

        {/* Expanded detailed info */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-xs font-mono">
              <h3 className="text-yellow-400 font-bold mb-2">
                🔍 Detailed Info
              </h3>

              <div className="space-y-2">
                <div>
                  <span className="text-blue-400">Current Date:</span>{" "}
                  {debugInfo.currentDate}
                </div>
                <div>
                  <span className="text-blue-400">Reviews Today (calc):</span>{" "}
                  {debugInfo.reviewsToday}
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
                <h4 className="text-yellow-400 font-bold">
                  🔬 Sample Cards Data:
                </h4>
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
                            card.isReviewedToday
                              ? "text-green-400"
                              : "text-red-400"
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
          </div>
        )}
      </div>
    </div>
  );
};
