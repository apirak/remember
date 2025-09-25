// Complex Action Hooks
// Handles complex action helpers with side effects and business logic

import type { FlashcardContextState } from "../types/flashcard";
import { QUALITY_RATINGS } from "../utils/sm2";
import { FlashcardService } from "../services/flashcardService";
import { getCurrentUser } from "../utils/auth";

/**
 * Dependencies required by complex action hooks
 */
export interface FlashcardActionsDeps {
  state: FlashcardContextState;
  dispatch: React.Dispatch<any>;
  setLoadingState: (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => void;
  setSyncStatus: (status: "idle" | "syncing" | "error" | "offline") => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
  // Note: saveProgressToFirestore removed for batch save optimization
}

/**
 * Creates complex action helper methods with the provided dependencies
 * @param deps Dependencies for the action helpers
 * @returns Object containing all complex action helper methods
 */
export const createFlashcardActions = (deps: FlashcardActionsDeps) => {
  const {
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setError,
    clearError,
  } = deps;

  /**
   * Rate a flashcard with quality score and handle Firestore synchronization
   * @param quality Quality rating (0-5 scale)
   */
  const rateCard = async (quality: number): Promise<void> => {
    if (state.currentCard) {
      const currentCard = state.currentCard;

      // First, update the local state immediately (optimistic update)
      dispatch({
        type: "RATE_CARD",
        payload: { cardId: currentCard.id, quality },
      });

      // OPTIMIZATION: Defer Firestore writes for batch save at session completion
      // This reduces Firestore read/write operations during review session
      // Progress is tracked in sessionReducer.pendingProgress for batch save later
      
      // Note: All progress calculation and storage is now handled in sessionReducer
      // The updated card data is already stored in pendingProgress Map
      // Batch save will happen when:
      // 1. Session completes (isComplete = true)
      // 2. User navigates away from review screen
      // 3. Browser unload events (beforeunload)
      
      console.log('Card rated:', currentCard.id, 'quality:', quality, 
                  'batch save will occur at session completion');
      
      // Previous immediate Firestore save code commented out for optimization:
      /*
      if (!state.isGuest && state.dataSource === "firestore") {
        try {
          const updatedProgress = calculateSM2(currentCard, quality as QualityRating);
          await saveProgressToFirestore(currentCard.id, { ...progressData });
        } catch (error) {
          console.warn("Failed to save card rating to Firestore, will retry later:", error);
        }
      }
      */
    }
  };

  /**
   * Mark a card as "known" (equivalent to Easy rating)
   */
  const knowCard = async (): Promise<void> => {
    // "I Know" button is equivalent to "Easy" rating
    await rateCard(QUALITY_RATINGS.EASY);
  };

  /**
   * Reset all cards' progress and synchronize with Firestore if authenticated
   */
  const resetTodayProgress = async (): Promise<void> => {
    // Reset all cards and progress counters locally first
    dispatch({ type: "RESET_TODAY_PROGRESS" });

    // If user is authenticated and data source is Firestore, reset cards in Firestore too
    if (!state.isGuest && state.dataSource === "firestore") {
      try {
        setLoadingState("savingProgress", true);
        setSyncStatus("syncing");
        clearError();

        const currentUser = getCurrentUser();
        if (!currentUser) {
          setError(
            "User must be authenticated to reset progress in Firestore."
          );
          return;
        }

        // Get the current cards after reset (they should be reset with default SM-2 values)
        const resetCards = state.allCards.map((card) => ({
          ...card,
          nextReviewDate: new Date(),
          interval: 1,
          repetitions: 0,
          totalReviews: 0,
          easinessFactor: 2.5, // Reset to default SM2 value
          isNew: true,
          lastReviewDate: new Date(0), // Reset to epoch
          correctStreak: 0,
          averageQuality: 0,
          updatedAt: new Date(),
        }));

        // Save all reset cards to Firestore using batch operation
        let currentCardSet = state.currentCardSet;
        if (!currentCardSet) {
          // Use default card set if none is selected
          currentCardSet = {
            id: "chinese_essentials_1",
            name: "Chinese Essentials 1",
            cover: "🇨🇳",
            dataFile: "chinese_essentials_in_communication_1.json",
          };
        }

        const result = await FlashcardService.saveCardsBatch(
          resetCards,
          currentCardSet.id
        );

        if (result.success) {
          setSyncStatus("idle");
          dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
          console.log(
            `Successfully reset all cards progress in Firestore for card set: ${currentCardSet.name}`
          );
        } else {
          throw new Error(
            result.error || "Failed to reset progress in Firestore"
          );
        }
      } catch (error) {
        console.error("Error resetting progress in Firestore:", error);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to reset progress in Firestore"
        );
        setSyncStatus("error");

        // Note: Local reset already happened, so user can still use the app
        // but their Firestore data won't be reset until next sync
      } finally {
        setLoadingState("savingProgress", false);
      }
    }
  };

  return {
    rateCard,
    knowCard,
    resetTodayProgress,
  };
};
