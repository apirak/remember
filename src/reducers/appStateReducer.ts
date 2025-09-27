// App State Management Reducer
// Handles loading states, sync status, error handling, pending operations, and user authentication

import type { FlashcardContextState } from '../types/flashcard';

/**
 * App state-related action types that this reducer handles
 */
export type AppStateAction =
  // Loading states
  | {
      type: 'SET_LOADING_STATE';
      payload: {
        key: keyof FlashcardContextState['loadingStates'];
        value: boolean;
      };
    }
  // Data source and sync management
  | { type: 'SET_DATA_SOURCE'; payload: 'session' | 'firestore' | 'fallback' }
  | {
      type: 'SET_SYNC_STATUS';
      payload: 'idle' | 'syncing' | 'error' | 'offline';
    }
  | { type: 'SET_LAST_SYNC_TIME'; payload: Date | null }
  // Error handling
  | { type: 'SET_ERROR'; payload: any }
  | { type: 'CLEAR_ERROR' }
  // Pending operations
  | { type: 'ADD_PENDING_OPERATION'; payload: any }
  | { type: 'REMOVE_PENDING_OPERATION'; payload: string }
  | { type: 'RETRY_PENDING_OPERATIONS' }
  // Migration
  | {
      type: 'SET_MIGRATION_STATUS';
      payload: 'none' | 'in-progress' | 'completed' | 'failed';
    }
  // User authentication
  | { type: 'SET_USER'; payload: { user: any; isGuest: boolean } }
  // Card set management
  | {
      type: 'SET_SELECTED_CARD_SET';
      payload: import('../types/flashcard').CardSet | null;
    }
  | {
      type: 'SET_LAST_WORKING_CARD_SET';
      payload: import('../types/flashcard').CardSet | null;
    }
  // OPTIMIZED CACHE ACTIONS
  | {
      type: 'UPDATE_CARD_SET_PROGRESS_OPTIMISTIC';
      payload: {
        cardSetId: string;
        progress: import('../types/flashcard').CardSetProgress;
      };
    }
  | { type: 'CLEAR_CACHE' }
  | { type: 'INITIALIZE_CACHE'; payload: any }
  | { type: 'SYNC_CACHE_STATE' };

/**
 * App state reducer - handles all app state-related updates
 * @param state Current flashcard context state
 * @param action App state action to process
 * @returns Updated state
 */
export const appStateReducer = (
  state: FlashcardContextState,
  action: AppStateAction
): Partial<FlashcardContextState> => {
  switch (action.type) {
    // Enhanced loading states
    case 'SET_LOADING_STATE': {
      const { key, value } = action.payload;
      return {
        loadingStates: {
          ...state.loadingStates,
          [key]: value,
        },
      };
    }

    // Data source and sync management
    case 'SET_DATA_SOURCE': {
      return {
        dataSource: action.payload,
      };
    }

    case 'SET_SYNC_STATUS': {
      return {
        syncStatus: action.payload,
      };
    }

    case 'SET_LAST_SYNC_TIME': {
      return {
        lastSyncTime: action.payload,
      };
    }

    // Error handling
    case 'SET_ERROR': {
      return {
        error: action.payload,
      };
    }

    case 'CLEAR_ERROR': {
      return {
        error: null,
      };
    }

    case 'ADD_PENDING_OPERATION': {
      return {
        pendingOperations: [...state.pendingOperations, action.payload],
      };
    }

    case 'REMOVE_PENDING_OPERATION': {
      return {
        pendingOperations: state.pendingOperations.filter(
          (op) => op.id !== action.payload
        ),
      };
    }

    case 'RETRY_PENDING_OPERATIONS': {
      // Reset retry count for all pending operations
      return {
        pendingOperations: state.pendingOperations.map((op) => ({
          ...op,
          retryCount: 0,
        })),
      };
    }

    // Migration
    case 'SET_MIGRATION_STATUS': {
      return {
        migrationStatus: action.payload,
      };
    }

    // User authentication
    case 'SET_USER': {
      const { user, isGuest } = action.payload;
      return {
        user,
        isGuest,
      };
    }

    // Card set management
    case 'SET_SELECTED_CARD_SET': {
      return {
        ...state,
        selectedCardSet: action.payload,
      };
    }

    case 'SET_LAST_WORKING_CARD_SET': {
      return {
        lastWorkingCardSet: action.payload
          ? {
              id: action.payload.id,
              name: action.payload.name,
              cover: action.payload.cover,
              dataFile: action.payload.dataFile,
            }
          : null,
      };
    }

    // OPTIMIZED CACHE ACTIONS
    case 'UPDATE_CARD_SET_PROGRESS_OPTIMISTIC': {
      // Handle optimistic progress update in UI state
      // The actual progress is managed by the cache layer
      return {
        syncStatus: 'syncing' as const,
        lastSyncTime: new Date(),
      };
    }

    case 'CLEAR_CACHE': {
      return {
        syncStatus: 'idle' as const,
        dataSource: 'session' as const,
        lastSyncTime: null,
        error: null,
      };
    }

    case 'INITIALIZE_CACHE': {
      return {
        dataSource: 'firestore' as const,
        syncStatus: 'idle' as const,
        lastSyncTime: new Date(),
      };
    }

    case 'SYNC_CACHE_STATE': {
      return {
        syncStatus: 'idle' as const,
        lastSyncTime: new Date(),
      };
    }

    default:
      return {}; // No changes for unknown actions
  }
};
