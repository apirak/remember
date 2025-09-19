// Firestore Operations
// Handles all Firestore integration methods for the FlashcardContext
// These methods are created as factory functions and used within the context

import type { Flashcard, FlashcardContextState } from "../types/flashcard";
import { FlashcardService } from "../services/flashcardService";

/**
 * Dependencies required by Firestore operations
 */
export interface FirestoreOperationsDeps {
  dispatch: React.Dispatch<any>;
  setLoadingState: (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => void;
  setSyncStatus: (status: "idle" | "syncing" | "error" | "offline") => void;
  setDataSource: (source: "session" | "firestore" | "fallback") => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
}

/**
 * Creates Firestore operation methods with the provided dependencies
 * @param deps Dependencies for the operations
 * @returns Object containing all Firestore operation methods
 */
export const createFirestoreOperations = (deps: FirestoreOperationsDeps) => {
  const {
    dispatch,
    setLoadingState,
    setSyncStatus,
    setDataSource,
    setError,
    clearError,
  } = deps;

  /**
   * Load user's flashcards from Firestore
   */
  const loadCardsFromFirestore = async (): Promise<void> => {
    try {
      setLoadingState("fetchingCards", true);
      setSyncStatus("syncing");
      clearError();

      const result = await FlashcardService.loadUserFlashcards();

      if (result.success && result.data) {
        dispatch({ type: "LOAD_CARDS", payload: result.data });
        setDataSource("firestore");
        setSyncStatus("idle");
        dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });

        console.log(`Loaded ${result.data.length} cards from Firestore`);
      } else {
        throw new Error(result.error || "Failed to load cards from Firestore");
      }
    } catch (error) {
      console.error("Error loading cards from Firestore:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load cards from Firestore"
      );
      setSyncStatus("error");

      // Fallback to default cards if Firestore fails
      console.log("Falling back to default cards due to Firestore error");
      const defaultCards = FlashcardService.getDefaultFlashcards();
      dispatch({ type: "LOAD_CARDS", payload: defaultCards });
      setDataSource("fallback");
    } finally {
      setLoadingState("fetchingCards", false);
    }
  };

  /**
   * Save a single flashcard to Firestore
   * @param card The flashcard to save
   */
  const saveCardToFirestore = async (card: Flashcard): Promise<void> => {
    try {
      setLoadingState("savingProgress", true);
      setSyncStatus("syncing");
      clearError();

      const result = await FlashcardService.saveCard(card);

      if (result.success) {
        setSyncStatus("idle");
        dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
        console.log(`Saved card ${card.id} to Firestore`);
      } else {
        throw new Error(result.error || "Failed to save card to Firestore");
      }
    } catch (error) {
      console.error("Error saving card to Firestore:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save card to Firestore"
      );
      setSyncStatus("error");

      // Add to pending operations for retry
      const pendingOp = FlashcardService.createPendingOperation(
        "add_card",
        card
      );
      dispatch({ type: "ADD_PENDING_OPERATION", payload: pendingOp });
    } finally {
      setLoadingState("savingProgress", false);
    }
  };

  /**
   * Save card progress data to Firestore
   * @param cardId ID of the card to update
   * @param progressData Progress data to save
   */
  const saveProgressToFirestore = async (
    cardId: string,
    progressData: any
  ): Promise<void> => {
    try {
      setLoadingState("savingProgress", true);
      setSyncStatus("syncing");
      clearError();

      const result = await FlashcardService.saveProgress(cardId, progressData);

      if (result.success) {
        setSyncStatus("idle");
        dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
        console.log(`Updated progress for card ${cardId} in Firestore`);
      } else {
        throw new Error(result.error || "Failed to save progress to Firestore");
      }
    } catch (error) {
      console.error("Error saving progress to Firestore:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save progress to Firestore"
      );
      setSyncStatus("error");

      // Add to pending operations for retry
      const pendingOp = FlashcardService.createPendingOperation("rate_card", {
        cardId,
        progressData,
      });
      dispatch({ type: "ADD_PENDING_OPERATION", payload: pendingOp });
    } finally {
      setLoadingState("savingProgress", false);
    }
  };

  /**
   * Migrate guest data to Firestore after user authentication
   * @param guestData Guest data to migrate
   */
  const migrateGuestDataToFirestore = async (guestData: any): Promise<void> => {
    try {
      setLoadingState("migrating", true);
      dispatch({ type: "SET_MIGRATION_STATUS", payload: "in-progress" });
      setSyncStatus("syncing");
      clearError();

      const result = await FlashcardService.migrateGuestData(guestData);

      if (result.success) {
        // After successful migration, load the migrated cards
        await loadCardsFromFirestore();

        dispatch({ type: "SET_MIGRATION_STATUS", payload: "completed" });
        setSyncStatus("idle");
        setDataSource("firestore");

        console.log("Successfully migrated guest data to Firestore");
      } else {
        throw new Error(result.error || "Failed to migrate data to Firestore");
      }
    } catch (error) {
      console.error("Error migrating data to Firestore:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to migrate data to Firestore"
      );
      dispatch({ type: "SET_MIGRATION_STATUS", payload: "failed" });
      setSyncStatus("error");
    } finally {
      setLoadingState("migrating", false);
    }
  };

  return {
    loadCardsFromFirestore,
    saveCardToFirestore,
    saveProgressToFirestore,
    migrateGuestDataToFirestore,
  };
};
