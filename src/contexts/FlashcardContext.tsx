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
import flashcardsData from "../data/flashcards.json";
import { transformFlashcardData } from "../utils/seedData";
// Auth utilities for authentication monitoring
import { onAuthStateChange } from "../utils/auth";
// Session reducer for session management
import { sessionReducer, type SessionAction } from "../reducers/sessionReducer";
// Card reducer for card management
import { cardReducer, type CardAction } from "../reducers/cardReducer";
// App state reducer for loading, sync, error management
import {
  appStateReducer,
  type AppStateAction,
} from "../reducers/appStateReducer";
// Firestore operations
import { createFirestoreOperations } from "../hooks/useFirestoreOperations";
// Complex action hooks
import { createFlashcardActions } from "../hooks/useFlashcardActions";

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

  // Check if this is an app state action and delegate to app state reducer
  if (
    action.type === "SET_LOADING_STATE" ||
    action.type === "SET_DATA_SOURCE" ||
    action.type === "SET_SYNC_STATUS" ||
    action.type === "SET_LAST_SYNC_TIME" ||
    action.type === "SET_ERROR" ||
    action.type === "CLEAR_ERROR" ||
    action.type === "ADD_PENDING_OPERATION" ||
    action.type === "REMOVE_PENDING_OPERATION" ||
    action.type === "RETRY_PENDING_OPERATIONS" ||
    action.type === "SET_MIGRATION_STATUS" ||
    action.type === "SET_USER"
  ) {
    const appStateUpdates = appStateReducer(state, action as AppStateAction);
    return { ...state, ...appStateUpdates };
  }

  // If we reach here, it's an unknown action type
  console.warn(`Unknown action type: ${(action as any).type}`);
  return state;
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

  const nextCard = () => {
    dispatch({ type: "NEXT_CARD" });
  };

  const completeSession = () => {
    dispatch({ type: "COMPLETE_SESSION" });
  };

  const resetSession = () => {
    dispatch({ type: "RESET_SESSION" });
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

  // Create Firestore operations using the factory function
  const firestoreOperations = createFirestoreOperations({
    dispatch,
    setLoadingState,
    setSyncStatus,
    setDataSource,
    setError,
    clearError,
  });

  // Extract individual methods for backward compatibility
  const {
    loadCardsFromFirestore,
    saveCardToFirestore,
    saveProgressToFirestore,
    migrateGuestDataToFirestore,
  } = firestoreOperations;

  // Create complex action helpers using the factory function
  const flashcardActions = createFlashcardActions({
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setError,
    clearError,
    saveProgressToFirestore,
  });

  // Extract individual methods for backward compatibility
  const { rateCard, knowCard, resetTodayProgress } = flashcardActions;

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
