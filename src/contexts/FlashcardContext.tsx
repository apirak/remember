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
// Enhanced error handling for card set operations
import {
  createCardSetError,
  getErrorCodeFromException,
  validateCardSetData,
} from "../utils/cardSetErrors";
// Auth utilities for authentication monitoring
import { onAuthStateChange } from "../utils/auth";
// Main flashcard reducer
import { flashcardReducer } from "../reducers/flashcardReducer";
// Firestore operations
import { createFirestoreOperations } from "../hooks/useFirestoreOperations";
// Complex action hooks
import { createFlashcardActions } from "../hooks/useFlashcardActions";
// Card set persistence for remembering user's last selected set
import {
  saveLastCardSet,
  loadLastCardSet,
  isStorageAvailable,
} from "../utils/cardSetPersistence";

export const MAX_REVIEW_CARDS = 10;

/**
 * Get initial card set with persistence support
 * Tries to load from localStorage first, falls back to default
 */
const getInitialCardSet = () => {
  // Try to load from localStorage if available
  if (isStorageAvailable()) {
    const savedCardSet = loadLastCardSet();
    if (savedCardSet) {
      console.log(
        "FlashcardContext: Restored card set from localStorage",
        savedCardSet.name
      );
      return savedCardSet;
    }
  }

  // Default fallback card set
  const defaultCardSet = {
    id: "chinese_essentials_1",
    name: "Chinese Essentials 1",
    cover: "🇨🇳",
    dataFile: "chinese_essentials_in_communication_1.json",
  };

  console.log("FlashcardContext: Using default card set", defaultCardSet.name);
  return defaultCardSet;
};

/**
 * Initial state for the FlashcardContext
 * Sets up default values for all state properties
 */
const initialState: FlashcardContextState = {
  // Core flashcard data
  allCards: [],
  dueCards: [],
  currentSession: null,
  currentCard: null,

  // Card set management - will be initialized in provider
  currentCardSet: null,

  isLoading: false,
  isShowingBack: false,

  // Enhanced loading states for different operations
  loadingStates: {
    fetchingCards: false,
    savingProgress: false,
    creatingCard: false,
    deletingCard: false,
    migrating: false,
  },

  // Data source and synchronization tracking
  dataSource: "session",
  syncStatus: "idle",
  lastSyncTime: null,

  // Error handling and retry mechanism
  error: null,
  pendingOperations: [],

  // Migration status for guest-to-user data transfer
  migrationStatus: "none",

  // Statistics for dashboard display
  stats: {
    totalCards: 0,
    dueCards: 0,
    masteredCards: 0,
    difficultCards: 0,
    reviewsToday: 0,
  },

  // User authentication state
  isGuest: true,
  user: null,
};

/**
 * React Context for flashcard application state management
 * Provides all necessary methods and state for flashcard operations
 */
const FlashcardContext = createContext<{
  state: FlashcardContextState;
  dispatch: React.Dispatch<FlashcardAction>;

  // Core action helpers for flashcard operations
  loadCards: (cards: Flashcard[]) => void;
  loadCardSetData: (dataFile: string) => Promise<void>;
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
  setCurrentCardSet: (
    cardSet: {
      id: string;
      name: string;
      cover: string;
      dataFile: string;
    } | null
  ) => void;

  // Firestore integration methods
  loadCardsFromFirestore: () => Promise<void>;
  saveCardToFirestore: (card: Flashcard) => Promise<void>;
  saveProgressToFirestore: (cardId: string, progressData: any) => Promise<void>;
  migrateGuestDataToFirestore: (guestData: any) => Promise<void>;
} | null>(null);

/**
 * FlashcardProvider component that wraps the application with flashcard context
 * Manages initialization, authentication monitoring, and provides all flashcard functionality
 */
export const FlashcardProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(flashcardReducer, initialState);

  /**
   * Load flashcard data for a specific card set with enhanced error handling
   * @param dataFile - The JSON file name to load card data from
   */
  const loadCardSetData = async (dataFile: string) => {
    try {
      console.log(`FlashcardContext: Loading card set data from ${dataFile}`);
      dispatch({ type: "SET_LOADING", payload: true });

      // Dynamically import the card set data file
      const cardSetModule = await import(
        /* @vite-ignore */ `../data/${dataFile}`
      );
      const cardSetData = cardSetModule.default || cardSetModule;

      // Validate the loaded data structure
      try {
        validateCardSetData(cardSetData);
      } catch (validationError) {
        throw createCardSetError(
          "CARD_SET_INVALID_DATA",
          state.currentCardSet?.id,
          dataFile,
          validationError
        );
      }

      // Transform raw data to include SM-2 parameters
      const transformedCards = (cardSetData as FlashcardData[]).map(
        transformFlashcardData
      );

      // Check if we have any valid cards after transformation
      if (transformedCards.length === 0) {
        throw createCardSetError(
          "CARD_SET_EMPTY",
          state.currentCardSet?.id,
          dataFile
        );
      }

      dispatch({ type: "LOAD_CARDS", payload: transformedCards });
      console.log(
        `FlashcardContext: Successfully loaded ${transformedCards.length} cards from ${dataFile}`
      );
    } catch (error) {
      console.error(
        `FlashcardContext: Error loading card set data from ${dataFile}:`,
        error
      );

      // Create specific error based on the type of failure
      const errorCode = getErrorCodeFromException(error);
      const cardSetError = createCardSetError(
        errorCode,
        state.currentCardSet?.id,
        dataFile,
        error
      );

      // Set the specific error for user feedback
      dispatch({
        type: "SET_ERROR",
        payload: cardSetError,
      });

      // Fallback to default data if loading fails (but still show the error)
      console.log("FlashcardContext: Falling back to default flashcard data");
      const transformedCards = (flashcardsData as FlashcardData[]).map(
        transformFlashcardData
      );
      dispatch({ type: "LOAD_CARDS", payload: transformedCards });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  /**
   * Initialize card set from localStorage on component mount
   */
  useEffect(() => {
    // Only initialize if currentCardSet is null (initial state)
    if (!state.currentCardSet) {
      const initialCardSet = getInitialCardSet();
      dispatch({ type: "SET_CURRENT_CARD_SET", payload: initialCardSet });
    }
  }, []);

  /**
   * Load initial flashcard data on component mount
   * Transforms raw JSON data to include SM-2 algorithm parameters
   */
  useEffect(() => {
    // Load data for the initial card set
    if (state.currentCardSet?.dataFile) {
      loadCardSetData(state.currentCardSet.dataFile);
    } else {
      // Fallback to default data
      dispatch({ type: "SET_LOADING", payload: true });
      const transformedCards = (flashcardsData as FlashcardData[]).map(
        transformFlashcardData
      );
      dispatch({ type: "LOAD_CARDS", payload: transformedCards });
    }
  }, [state.currentCardSet]); // Now depends on currentCardSet

  /**
   * Load new card set data when currentCardSet changes
   */
  useEffect(() => {
    if (state.currentCardSet?.dataFile) {
      console.log(
        `FlashcardContext: Card set changed to ${state.currentCardSet.name}, loading new data`
      );
      loadCardSetData(state.currentCardSet.dataFile);
    }
  }, [state.currentCardSet?.dataFile]);

  /**
   * Monitor authentication state changes and load appropriate data
   * Handles sign-in/sign-out flow and data source switching
   */
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

  /**
   * Basic action helper functions for core flashcard operations
   */
  const loadCards = (cards: Flashcard[]) => {
    dispatch({ type: "LOAD_CARDS", payload: cards });
  };

  const startReviewSession = () => {
    if (state.dueCards.length > 0) {
      // Limit review session to maximum 20 cards
      const reviewCards = state.dueCards.slice(0, MAX_REVIEW_CARDS);
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

  /**
   * Enhanced helper functions for loading states and error handling
   */
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

  /**
   * Factory function implementations for complex operations
   * Uses dependency injection pattern to provide necessary context methods
   */

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

  /**
   * Set the current card set and persist to localStorage
   */
  const setCurrentCardSet = (
    cardSet: {
      id: string;
      name: string;
      cover: string;
      dataFile: string;
    } | null
  ) => {
    console.log("FlashcardContext: Setting current card set", cardSet);

    // Update context state
    dispatch({ type: "SET_CURRENT_CARD_SET", payload: cardSet });

    // Persist to localStorage if card set is valid and storage is available
    if (cardSet && isStorageAvailable()) {
      saveLastCardSet(cardSet);
    }
  };

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

  /**
   * Context value object that provides all state and methods to consumers
   */
  const contextValue = {
    state,
    dispatch,
    // Core flashcard operations
    loadCards,
    loadCardSetData,
    startReviewSession,
    showCardBack,
    rateCard,
    knowCard,
    nextCard,
    completeSession,
    resetSession,
    resetTodayProgress,
    // State management helpers
    setLoadingState,
    setDataSource,
    setSyncStatus,
    setError,
    clearError,
    retryPendingOperations,
    setUser,
    setCurrentCardSet,
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

/**
 * Custom hook to access the flashcard context
 * Ensures the hook is used within a FlashcardProvider
 * @returns Flashcard context value with all state and methods
 */
export const useFlashcard = () => {
  const context = useContext(FlashcardContext);
  if (!context) {
    throw new Error("useFlashcard must be used within a FlashcardProvider");
  }
  return context;
};

export default FlashcardContext;
