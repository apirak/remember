// FlashcardContext - React Context for managing flashcard state
// Handles card data, review sessions, and progress tracking

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode,
} from "react";
import type {
  FlashcardContextState,
  FlashcardAction,
  Flashcard,
  FlashcardData,
} from "../types/flashcard";
import {
  calculateSM2,
  QUALITY_RATINGS,
  type QualityRating,
} from "../utils/sm2";
import flashcardsData from "../data/flashcards.json";
import { transformFlashcardData } from "../utils/seedData";
// Flashcard service for Firestore operations
import { FlashcardService } from "../services/flashcardService";
import { getCurrentUser, onAuthStateChange } from "../utils/auth";
// Session reducer for session management
import { sessionReducer, type SessionAction } from "../reducers/sessionReducer";
// Card reducer for card management
import { cardReducer, type CardAction } from "../reducers/cardReducer";

// Initial state
const initialState: FlashcardContextState = {
  allCards: [],
  dueCards: [],
  currentSession: null,
  currentCard: null,
  isLoading: false,
  isShowingBack: false,

  // Enhanced loading states
  loadingStates: {
    fetchingCards: false,
    savingProgress: false,
    creatingCard: false,
    deletingCard: false,
    migrating: false,
  },

  // Data source and sync status
  dataSource: "session",
  syncStatus: "idle",
  lastSyncTime: null,

  // Error handling
  error: null,
  pendingOperations: [],

  // Migration status
  migrationStatus: "none",

  stats: {
    totalCards: 0,
    dueCards: 0,
    masteredCards: 0,
    difficultCards: 0,
    reviewsToday: 0,
  },
  isGuest: true,
  user: null,
};

// Reducer function to manage state updates
const flashcardReducer = (
  state: FlashcardContextState,
  action: FlashcardAction
): FlashcardContextState => {
  // Check if this is a session action and delegate to session reducer
  if (
    action.type === "START_REVIEW_SESSION" ||
    action.type === "SHOW_CARD_BACK" ||
    action.type === "RATE_CARD" ||
    action.type === "NEXT_CARD" ||
    action.type === "COMPLETE_SESSION" ||
    action.type === "RESET_SESSION"
  ) {
    const sessionUpdates = sessionReducer(state, action as SessionAction);
    return { ...state, ...sessionUpdates };
  }

  // Check if this is a card action and delegate to card reducer
  if (
    action.type === "LOAD_CARDS" ||
    action.type === "UPDATE_STATS" ||
    action.type === "RESET_TODAY_PROGRESS" ||
    action.type === "SET_LOADING"
  ) {
    const cardUpdates = cardReducer(state, action as CardAction);
    return { ...state, ...cardUpdates };
  }

  switch (action.type) {
    // Enhanced loading states
    case "SET_LOADING_STATE": {
      const { key, value } = action.payload;
      return {
        ...state,
        loadingStates: {
          ...state.loadingStates,
          [key]: value,
        },
      };
    }

    // Data source and sync management
    case "SET_DATA_SOURCE": {
      return {
        ...state,
        dataSource: action.payload,
      };
    }

    case "SET_SYNC_STATUS": {
      return {
        ...state,
        syncStatus: action.payload,
      };
    }

    case "SET_LAST_SYNC_TIME": {
      return {
        ...state,
        lastSyncTime: action.payload,
      };
    }

    // Error handling
    case "SET_ERROR": {
      return {
        ...state,
        error: action.payload,
      };
    }

    case "CLEAR_ERROR": {
      return {
        ...state,
        error: null,
      };
    }

    case "ADD_PENDING_OPERATION": {
      return {
        ...state,
        pendingOperations: [...state.pendingOperations, action.payload],
      };
    }

    case "REMOVE_PENDING_OPERATION": {
      return {
        ...state,
        pendingOperations: state.pendingOperations.filter(
          (op) => op.id !== action.payload
        ),
      };
    }

    case "RETRY_PENDING_OPERATIONS": {
      // Reset retry count for all pending operations
      return {
        ...state,
        pendingOperations: state.pendingOperations.map((op) => ({
          ...op,
          retryCount: 0,
        })),
      };
    }

    // Migration
    case "SET_MIGRATION_STATUS": {
      return {
        ...state,
        migrationStatus: action.payload,
      };
    }

    // User authentication
    case "SET_USER": {
      const { user, isGuest } = action.payload;
      return {
        ...state,
        user,
        isGuest,
      };
    }

    default:
      return state;
  }
};

// Create context
const FlashcardContext = createContext<{
  state: FlashcardContextState;
  dispatch: React.Dispatch<FlashcardAction>;
  // Action helpers
  loadCards: (cards: Flashcard[]) => void;
  startReviewSession: () => void;
  showCardBack: () => void;
  rateCard: (quality: number) => Promise<void>;
  knowCard: () => Promise<void>;
  nextCard: () => void;
  completeSession: () => void;
  resetSession: () => void;
  resetTodayProgress: () => Promise<void>;
  // Enhanced helpers for loading states and error handling
  setLoadingState: (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => void;
  setDataSource: (source: "session" | "firestore" | "fallback") => void;
  setSyncStatus: (status: "idle" | "syncing" | "error" | "offline") => void;
  setError: (error: string, retryable?: boolean) => void;
  clearError: () => void;
  retryPendingOperations: () => void;
  setUser: (user: any, isGuest: boolean) => void;
  // Firestore integration methods
  loadCardsFromFirestore: () => Promise<void>;
  saveCardToFirestore: (card: Flashcard) => Promise<void>;
  saveProgressToFirestore: (cardId: string, progressData: any) => Promise<void>;
  migrateGuestDataToFirestore: (guestData: any) => Promise<void>;
} | null>(null);

// Context provider component
export const FlashcardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  // Load initial flashcard data on mount
  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: true });

    // Transform raw data to include SM-2 parameters
    const transformedCards = (flashcardsData as FlashcardData[]).map(
      transformFlashcardData
    );

    dispatch({ type: "LOAD_CARDS", payload: transformedCards });
  }, []);

  // Monitor authentication state changes and load Firestore data for authenticated users
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        // User signed in - convert to UserProfile and set user state
        const userProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isGuest: false,
        };

        setUser(userProfile, false);

        // Load user's cards from Firestore
        loadCardsFromFirestore().catch((error) => {
          console.error(
            "Failed to load cards from Firestore after sign-in:",
            error
          );
          // If Firestore loading fails, keep using default cards as fallback
        });
      } else {
        // User signed out or is guest - use session storage and default cards
        setUser(null, true);
        setDataSource("session");

        // Load default cards
        const transformedCards = (flashcardsData as FlashcardData[]).map(
          transformFlashcardData
        );
        dispatch({ type: "LOAD_CARDS", payload: transformedCards });
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array since we want this to run once on mount

  // Action helper functions
  const loadCards = (cards: Flashcard[]) => {
    dispatch({ type: "LOAD_CARDS", payload: cards });
  };

  const startReviewSession = () => {
    if (state.dueCards.length > 0) {
      // Limit review session to maximum 20 cards
      const reviewCards = state.dueCards.slice(0, 20);
      dispatch({ type: "START_REVIEW_SESSION", payload: reviewCards });
    }
  };

  const showCardBack = () => {
    dispatch({ type: "SHOW_CARD_BACK" });
  };

  const rateCard = async (quality: number) => {
    if (state.currentCard) {
      const currentCard = state.currentCard;

      // First, update the local state immediately (optimistic update)
      dispatch({
        type: "RATE_CARD",
        payload: { cardId: currentCard.id, quality },
      });

      // If user is authenticated and data source is Firestore, save to Firestore
      if (!state.isGuest && state.dataSource === "firestore") {
        try {
          // Calculate the updated progress data using SM-2 algorithm
          const updatedProgress = calculateSM2(
            currentCard,
            quality as QualityRating
          );

          // Save progress to Firestore in background
          await saveProgressToFirestore(currentCard.id, {
            easinessFactor: updatedProgress.easinessFactor,
            repetitions: updatedProgress.repetitions,
            interval: updatedProgress.interval,
            nextReviewDate: updatedProgress.nextReviewDate,
            lastReviewDate: new Date(),
            totalReviews: currentCard.totalReviews + 1,
            correctStreak:
              quality >= QUALITY_RATINGS.HARD
                ? currentCard.correctStreak + 1
                : 0,
            averageQuality:
              (currentCard.averageQuality * currentCard.totalReviews +
                quality) /
              (currentCard.totalReviews + 1),
            isNew: false,
          });
        } catch (error) {
          console.warn(
            "Failed to save card rating to Firestore, will retry later:",
            error
          );
          // Note: saveProgressToFirestore already handles adding to pending operations
        }
      }
    }
  };

  const knowCard = async () => {
    // "I Know" button is equivalent to "Easy" rating
    await rateCard(QUALITY_RATINGS.EASY);
  };

  const nextCard = () => {
    dispatch({ type: "NEXT_CARD" });
  };

  const completeSession = () => {
    dispatch({ type: "COMPLETE_SESSION" });
  };

  const resetSession = () => {
    dispatch({ type: "RESET_SESSION" });
  };

  const resetTodayProgress = async () => {
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
        const result = await FlashcardService.saveCardsBatch(resetCards);

        if (result.success) {
          setSyncStatus("idle");
          dispatch({ type: "SET_LAST_SYNC_TIME", payload: new Date() });
          console.log("Successfully reset all cards progress in Firestore");
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

  // Enhanced helper functions for loading states and error handling
  const setLoadingState = (
    key: keyof FlashcardContextState["loadingStates"],
    value: boolean
  ) => {
    dispatch({ type: "SET_LOADING_STATE", payload: { key, value } });
  };

  const setDataSource = (source: "session" | "firestore" | "fallback") => {
    dispatch({ type: "SET_DATA_SOURCE", payload: source });
  };

  const setSyncStatus = (status: "idle" | "syncing" | "error" | "offline") => {
    dispatch({ type: "SET_SYNC_STATUS", payload: status });
  };

  const setError = (errorMessage: string, retryable: boolean = true) => {
    const error = {
      code: "CONTEXT_ERROR",
      message: errorMessage,
      retryable,
      timestamp: new Date(),
    };
    dispatch({ type: "SET_ERROR", payload: error });
  };

  const clearError = () => {
    dispatch({ type: "CLEAR_ERROR" });
  };

  const retryPendingOperations = () => {
    dispatch({ type: "RETRY_PENDING_OPERATIONS" });
  };

  const setUser = (user: any, isGuest: boolean) => {
    dispatch({ type: "SET_USER", payload: { user, isGuest } });
  };

  // Firestore integration methods
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

  const contextValue = {
    state,
    dispatch,
    loadCards,
    startReviewSession,
    showCardBack,
    rateCard,
    knowCard,
    nextCard,
    completeSession,
    resetSession,
    resetTodayProgress,
    // Enhanced helpers
    setLoadingState,
    setDataSource,
    setSyncStatus,
    setError,
    clearError,
    retryPendingOperations,
    setUser,
    // Firestore integration methods
    loadCardsFromFirestore,
    saveCardToFirestore,
    saveProgressToFirestore,
    migrateGuestDataToFirestore,
  };

  return (
    <FlashcardContext.Provider value={contextValue}>
      {children}
    </FlashcardContext.Provider>
  );
};

// Custom hook to use the flashcard context
export const useFlashcard = () => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error("useFlashcard must be used within a FlashcardProvider");
  }
  return context;
};

export default FlashcardContext;
