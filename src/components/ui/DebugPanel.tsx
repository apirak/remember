// Debug Panel Component
// Shows debugging information in development mode only
// Global overlay that can be toggled from any page

import React, { useState, useEffect, useCallback } from 'react';
import { useFlashcard } from '../../contexts/FlashcardContext';
import {
  calculateReviewsToday,
  isCardReviewedToday,
} from '../../utils/flashcardHelpers';
import type { Flashcard } from '../../types/flashcard';
import { firestoreCounter } from '../../utils/simpleFirestoreCounter';

interface DebugPanelProps {
  position?: 'right' | 'left' | 'bottom';
  defaultVisible?: boolean;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  position = 'right',
  defaultVisible = false,
  visible: controlledVisible,
  onVisibilityChange,
}) => {
  const { state } = useFlashcard();
  const [internalVisible, setInternalVisible] = useState(defaultVisible);
  const [isExpanded, setIsExpanded] = useState(false);

  // Use controlled visibility if provided, otherwise use internal state
  const isVisible =
    controlledVisible !== undefined ? controlledVisible : internalVisible;

  const [firestoreStats, setFirestoreStats] = useState({
    totalReads: 0,
    totalWrites: 0,
    totalOps: 0,
  });

  // Function to toggle visibility
  const toggleVisibility = useCallback(() => {
    const newVisible = !isVisible;
    if (onVisibilityChange) {
      onVisibilityChange(newVisible);
    } else {
      setInternalVisible(newVisible);
    }
  }, [isVisible, onVisibilityChange]);

  // Only show in development or when explicitly enabled
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // Keyboard shortcut to toggle debug panel (Ctrl/Cmd + D)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleVisibility();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [toggleVisibility]);

  // Update Firestore stats every 2 seconds when visible (client-side only)
  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      const updateStats = () => {
        const stats = firestoreCounter.getStats();
        setFirestoreStats(stats);
      };
      updateStats(); // Initial update
      const interval = setInterval(updateStats, 2000);
      return () => clearInterval(interval);
    }
    // Return empty cleanup function when condition is not met
    return () => {};
  }, [isVisible]);

  if (!isVisible) {
    // Small floating toggle button when panel is hidden
    return (
      <button
        onClick={toggleVisibility}
        className="w-10 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center justify-center text-sm"
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
    currentCardSet: state.selectedCardSet?.name || 'None',
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

  // Determine panel positioning - now using inline layout instead of fixed
  const panelClasses =
    position === 'right'
      ? 'w-80 h-screen' // Right sidebar
      : position === 'left'
        ? 'w-80 h-screen' // Left sidebar
        : 'w-full h-64'; // Bottom panel

  return (
    <div
      className={`${panelClasses} bg-gray-900 text-green-400 shadow-2xl flex flex-col border-l border-gray-700`}
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
            {isExpanded ? '▼' : '▲'}
          </button>
          <button
            onClick={toggleVisibility}
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
            <span className="text-blue-400">Card Set:</span>{' '}
            {debugInfo.currentCardSet}
            {state.selectedCardSet && (
              <span className="text-xs text-gray-400">
                ID: {state.selectedCardSet.id}
              </span>
            )}
            {state.selectedCardSet && (
              <span className="text-xs text-gray-400">
                File: {state.selectedCardSet.dataFile}
              </span>
            )}
          </div>
          <div>
            <span className="text-blue-400">Total Cards:</span>{' '}
            {debugInfo.totalCards}
          </div>
          <div>
            <span className="text-blue-400">Due Cards:</span>{' '}
            {state.stats.dueCards}
          </div>
          <div>
            <span className="text-blue-400">Reviews Today:</span>{' '}
            {debugInfo.statsReviewsToday}
          </div>
          <div>
            <span className="text-blue-400">Data Source:</span>{' '}
            {debugInfo.dataSource}
          </div>
          <div>
            <span className="text-blue-400">Sync Status:</span>{' '}
            {debugInfo.syncStatus}
          </div>
          <div>
            <span className="text-blue-400">User Type:</span>{' '}
            {debugInfo.isGuest ? 'Guest' : 'Authenticated'}
          </div>

          {/* Firestore Operations Stats */}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="mb-1">
              <span className="text-orange-400">🔥 Firestore Operations</span>
            </div>
            <div className="text-xs space-y-0.5">
              <div>
                <span className="text-cyan-400">Reads:</span>{' '}
                {firestoreStats.totalReads}
              </div>
              <div>
                <span className="text-pink-400">Writes:</span>{' '}
                {firestoreStats.totalWrites}
              </div>
              <div>
                <span className="text-yellow-400">Total:</span>{' '}
                {firestoreStats.totalOps}
              </div>
            </div>
          </div>

          {/* Enhanced loading states */}
          {state.isLoading && (
            <div className="text-yellow-400">⏳ Loading card set data...</div>
          )}
          {state.loadingStates.savingProgress && (
            <div className="text-yellow-400">💾 Saving progress...</div>
          )}
          {state.loadingStates.fetchingCards && (
            <div className="text-yellow-400">
              📚 Fetching cards from Firestore...
            </div>
          )}

          {/* Card set transition status */}
          {state.isLoading && state.selectedCardSet && (
            <div className="text-xs text-amber-600 animate-pulse">
              📂 Loading: {state.selectedCardSet.name}
            </div>
          )}

          {/* Error states */}
          {state.error && (
            <div className="text-red-400 mt-2 pt-2 border-t border-gray-700">
              <div className="font-bold">⚠️ Error:</div>
              <div className="text-xs break-words">{state.error.message}</div>
              {state.error.context?.cardSetId && (
                <div className="text-xs text-gray-400">
                  Card Set: {state.error.context.cardSetId}
                </div>
              )}
            </div>
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

              {/* Current card info */}
              {state.currentCard && (
                <div className="mt-2 text-cyan-400">
                  <div className="font-bold">🃏 Current Card:</div>
                  <div className="text-xs">ID: {state.currentCard.id}</div>
                  <div className="text-xs">
                    Front: {state.currentCard.front.title.substring(0, 30)}
                    {state.currentCard.front.title.length > 30 ? '...' : ''}
                  </div>
                  {/* Card set validation info */}
                  {state.selectedCardSet && (
                    <div className="text-xs mt-1">
                      <span className="text-purple-400">Card-Set Match:</span>{' '}
                      {state.currentSession.cards.some(
                        (c) => c.id === state.currentCard?.id
                      )
                        ? '✅ Valid'
                        : '⚠️ Mismatch'}
                    </div>
                  )}
                </div>
              )}
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
                  <span className="text-blue-400">Current Date:</span>{' '}
                  {debugInfo.currentDate}
                </div>
                <div>
                  <span className="text-blue-400">Reviews Today (calc):</span>{' '}
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
                        {card.id}:{' '}
                        {card.lastReviewDate instanceof Date
                          ? card.lastReviewDate.toDateString()
                          : 'Invalid Date'}
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
                        <span className="text-blue-400">Type:</span>{' '}
                        {card.lastReviewDateType}
                      </div>
                      <div>
                        <span className="text-blue-400">Date:</span>{' '}
                        {card.lastReviewDateString}
                      </div>
                      <div>
                        <span className="text-blue-400">Today?:</span>
                        <span
                          className={
                            card.isReviewedToday
                              ? 'text-green-400'
                              : 'text-red-400'
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
