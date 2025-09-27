// Firestore Operations
// Handles all Firestore integration methods for the FlashcardContext
// These methods are created as factory functions and used within the context

import { useCallback } from 'react';
import type {
  Flashcard,
  FlashcardContextState,
  CardSetProgress,
} from '../types/flashcard';
import { FlashcardService } from '../services/flashcardService';
import { calculateCardSetProgress } from '../utils/flashcardHelpers';

/**
 * Dependencies required by Firestore operations
 */
export interface FirestoreOperationsDeps {
  state: FlashcardContextState;
  dispatch: React.Dispatch<any>;
  setLoadingState: (
    key: keyof FlashcardContextState['loadingStates'],
    value: boolean
  ) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'offline') => void;
  setDataSource: (source: 'session' | 'firestore' | 'fallback') => void;
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
    state,
    dispatch,
    setLoadingState,
    setSyncStatus,
    setDataSource,
    setError,
    clearError,
  } = deps;

  /**
   * Load user's flashcards from Firestore for current card set
   * Falls back to JSON if Firestore load fails
   */
  const loadCardsFromFirestore = async (): Promise<void> => {
    try {
      setLoadingState('fetchingCards', true);
      setSyncStatus('syncing');
      clearError();

      // Get current card set info with fallback to default
      let selectedCardSet = state.selectedCardSet;
      if (!selectedCardSet) {
        // Use default card set if none is selected
        selectedCardSet = {
          id: 'chinese_essentials_1',
          name: 'Chinese Essentials 1',
          description: 'Basic everyday communication',
          cover: '🇨🇳',
          cardCount: 0,
          category: 'language_basics',
          tags: ['chinese', 'communication', 'beginner'],
          dataFile: 'chinese_essentials_in_communication_1.json',
          author: 'HSK Learning Team',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        console.log(
          'Using default card set as fallback:',
          selectedCardSet.name
        );
      }

      const result = await FlashcardService.loadCardSetData(
        selectedCardSet.id,
        selectedCardSet.dataFile
      );

      if (result.success && result.data) {
        dispatch({ type: 'LOAD_CARDS', payload: result.data.cards });
        setDataSource(
          result.data.source === 'firestore' ? 'firestore' : 'fallback'
        );
        setSyncStatus('idle');
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });

        console.log(
          `Loaded ${result.data.cards.length} cards from ${result.data.source} for card set: ${selectedCardSet.name}`
        );
      } else {
        throw new Error(result.error || 'Failed to load cards');
      }
    } catch (error) {
      console.error('Error loading cards:', error);
      setError(error instanceof Error ? error.message : 'Failed to load cards');
      setSyncStatus('error');
      setDataSource('fallback');
    } finally {
      setLoadingState('fetchingCards', false);
    }
  };

  /**
   * Save a single flashcard to Firestore
   * @param card The flashcard to save
   */
  const saveCardToFirestore = async (card: Flashcard): Promise<void> => {
    try {
      setLoadingState('savingProgress', true);
      setSyncStatus('syncing');
      clearError();

      // Get current card set info with fallback to default
      let selectedCardSet = state.selectedCardSet;
      if (!selectedCardSet) {
        // Use default card set if none is selected
        selectedCardSet = {
          id: 'chinese_essentials_1',
          name: 'Chinese Essentials 1',
          description: 'Basic everyday communication',
          cover: '🇨🇳',
          cardCount: 0,
          category: 'language_basics',
          tags: ['chinese', 'communication', 'beginner'],
          dataFile: 'chinese_essentials_in_communication_1.json',
          author: 'HSK Learning Team',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const result = await FlashcardService.saveCard(card, selectedCardSet.id);

      if (result.success) {
        setSyncStatus('idle');
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });
        console.log(
          `Saved card ${card.id} to Firestore in card set: ${selectedCardSet.name}`
        );
      } else {
        throw new Error(result.error || 'Failed to save card to Firestore');
      }
    } catch (error) {
      console.error('Error saving card to Firestore:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to save card to Firestore'
      );
      setSyncStatus('error');

      // Add to pending operations for retry
      const pendingOp = FlashcardService.createPendingOperation('add_card', {
        ...card,
        cardSetId: state.selectedCardSet?.id,
      });
      dispatch({ type: 'ADD_PENDING_OPERATION', payload: pendingOp });
    } finally {
      setLoadingState('savingProgress', false);
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
      setLoadingState('savingProgress', true);
      setSyncStatus('syncing');
      clearError();

      // Get current card set info with fallback to default
      let selectedCardSet = state.selectedCardSet;
      if (!selectedCardSet) {
        // Use default card set if none is selected
        selectedCardSet = {
          id: 'chinese_essentials_1',
          name: 'Chinese Essentials 1',
          description: 'Basic everyday communication',
          cover: '🇨🇳',
          cardCount: 0,
          category: 'language_basics',
          tags: ['chinese', 'communication', 'beginner'],
          dataFile: 'chinese_essentials_in_communication_1.json',
          author: 'HSK Learning Team',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const result = await FlashcardService.saveProgress(
        cardId,
        selectedCardSet.id,
        progressData
      );

      if (result.success) {
        setSyncStatus('idle');
        dispatch({ type: 'SET_LAST_SYNC_TIME', payload: new Date() });
        console.log(
          `Updated progress for card ${cardId} in Firestore (card set: ${selectedCardSet.name})`
        );
      } else {
        throw new Error(result.error || 'Failed to save progress to Firestore');
      }
    } catch (error) {
      console.error('Error saving progress to Firestore:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to save progress to Firestore'
      );
      setSyncStatus('error');

      // Add to pending operations for retry
      const pendingOp = FlashcardService.createPendingOperation('rate_card', {
        cardId,
        cardSetId: state.selectedCardSet?.id,
        progressData,
      });
      dispatch({ type: 'ADD_PENDING_OPERATION', payload: pendingOp });
    } finally {
      setLoadingState('savingProgress', false);
    }
  };

  /**
   * Migrate guest data to Firestore after user authentication
   * @param guestData Guest data to migrate
   */
  const migrateGuestDataToFirestore = async (guestData: any): Promise<void> => {
    try {
      setLoadingState('migrating', true);
      dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'in-progress' });
      setSyncStatus('syncing');
      clearError();

      const result = await FlashcardService.migrateGuestData(guestData);

      if (result.success) {
        // Migration successful - the useEffect in FlashcardContext will handle reloading
        dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'completed' });
        setSyncStatus('idle');
        setDataSource('firestore');

        console.log('Successfully migrated guest data to Firestore');
      } else {
        throw new Error(result.error || 'Failed to migrate data to Firestore');
      }
    } catch (error) {
      console.error('Error migrating data to Firestore:', error);
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to migrate data to Firestore'
      );
      dispatch({ type: 'SET_MIGRATION_STATUS', payload: 'failed' });
      setSyncStatus('error');
    } finally {
      setLoadingState('migrating', false);
    }
  };

  /**
   * Load card set progress from Firestore for a specific card set
   * @param cardSetId - The card set identifier
   * @returns CardSetProgress object or null if not found
   */
  const loadCardSetProgress = async (
    cardSetId: string
  ): Promise<CardSetProgress | null> => {
    try {
      if (state.isGuest) {
        console.log('Guest mode: Cannot load card set progress from Firestore');
        return null;
      }

      const result = await FlashcardService.loadCardSetProgress(cardSetId);

      if (result.success && result.data !== undefined) {
        return result.data;
      } else {
        console.warn('Failed to load card set progress:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error loading card set progress:', error);
      return null;
    }
  };

  /**
   * Save card set progress to Firestore
   * @param progress - CardSetProgress object to save
   */
  const saveCardSetProgress = async (
    progress: CardSetProgress
  ): Promise<void> => {
    try {
      if (state.isGuest) {
        console.log('Guest mode: Cannot save card set progress to Firestore');
        return;
      }

      setLoadingState('savingProgress', true);
      setSyncStatus('syncing');
      clearError();

      const result = await FlashcardService.saveCardSetProgress(progress);

      if (result.success) {
        console.log(
          `Successfully saved progress for card set: ${progress.cardSetId}`
        );
        setSyncStatus('idle');
      } else {
        throw new Error(result.error || 'Failed to save card set progress');
      }
    } catch (error) {
      console.error('Error saving card set progress:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to save progress'
      );
      setSyncStatus('error');
    } finally {
      setLoadingState('savingProgress', false);
    }
  };

  /**
   * Calculate and update progress for the current card set
   * Uses the current allCards in state to calculate progress
   */
  const updateCurrentCardSetProgress = async (): Promise<void> => {
    try {
      console.log('updateCurrentCardSetProgress called:', {
        isGuest: state.isGuest,
        user: state.user?.uid || 'none',
        selectedCardSet: state.selectedCardSet?.id || 'none',
        allCardsCount: state.allCards.length,
      });

      if (state.isGuest || !state.selectedCardSet) {
        console.log('Guest mode or no card set: Cannot update progress');
        return;
      }

      if (!state.user) {
        console.log('No authenticated user found: Cannot update progress');
        return;
      }

      // Calculate progress from current cards in state
      const progress = calculateCardSetProgress(
        state.allCards,
        state.selectedCardSet.id
      );

      console.log(
        `Updating progress for ${state.selectedCardSet.name}: ${progress.progressPercentage}% (${progress.reviewedCards}/${progress.totalCards})`
      );

      // Save to Firestore
      await saveCardSetProgress(progress);
    } catch (error) {
      console.error('Error updating current card set progress:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to update progress'
      );
    }
  };

  /**
   * Load all card set progress data for the current user
   * Returns a map of cardSetId to progress percentage
   */
  const loadAllCardSetProgress = useCallback(async (): Promise<
    Record<string, number>
  > => {
    try {
      if (state.isGuest) {
        console.log('Guest mode: Cannot load card set progress from Firestore');
        return {};
      }

      if (!state.user) {
        console.log('No authenticated user: Cannot load card set progress');
        return {};
      }

      setLoadingState('fetchingCards', true);
      clearError();

      const result = await FlashcardService.loadAllCardSetProgress();

      if (result.success && result.data) {
        const progressMap: Record<string, number> = {};
        result.data.forEach((progress) => {
          progressMap[progress.cardSetId] = progress.progressPercentage;
        });
        console.log(
          `Loaded progress for ${Object.keys(progressMap).length} card sets`
        );
        return progressMap;
      } else {
        console.warn('No card set progress found:', result.error);
        return {};
      }
    } catch (error) {
      console.error('Error loading all card set progress:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load progress'
      );
      return {};
    } finally {
      setLoadingState('fetchingCards', false);
    }
  }, [state.isGuest, state.user, setLoadingState, clearError, setError]);

  /**
   * Load user profile from Firestore
   * @returns UserProfile object or null if not found
   */
  const loadUserProfile = useCallback(async () => {
    try {
      if (state.isGuest || !state.user) {
        console.log('Guest mode: Cannot load user profile from Firestore');
        return null;
      }

      setLoadingState('fetchingCards', true);
      clearError();

      const result = await FlashcardService.loadUserProfile();

      if (result.success) {
        console.log('Successfully loaded user profile from Firestore');
        return result.data;
      } else {
        console.warn('Failed to load user profile:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to load user profile'
      );
      return null;
    } finally {
      setLoadingState('fetchingCards', false);
    }
  }, [state.isGuest, state.user, setLoadingState, clearError, setError]);

  /**
   * Update user profile in Firestore (partial update)
   * @param updates - Partial UserProfile object with fields to update
   * @returns Success status
   */
  const updateUserProfile = useCallback(
    async (updates: any) => {
      try {
        if (state.isGuest || !state.user) {
          console.log('Guest mode: Cannot update user profile in Firestore');
          return false;
        }

        setLoadingState('savingProgress', true);
        setSyncStatus('syncing');
        clearError();

        const result = await FlashcardService.updateUserProfile(updates);

        if (result.success) {
          console.log('Successfully updated user profile in Firestore');
          setSyncStatus('idle');
          return true;
        } else {
          throw new Error(result.error || 'Failed to update user profile');
        }
      } catch (error) {
        console.error('Error updating user profile:', error);
        setSyncStatus('error');
        setError(
          error instanceof Error
            ? error.message
            : 'Failed to update user profile'
        );
        return false;
      } finally {
        setLoadingState('savingProgress', false);
      }
    },
    [
      state.isGuest,
      state.user,
      setLoadingState,
      setSyncStatus,
      clearError,
      setError,
    ]
  );

  return {
    loadCardsFromFirestore,
    saveCardToFirestore,
    saveProgressToFirestore,
    migrateGuestDataToFirestore,
    loadCardSetProgress,
    saveCardSetProgress,
    updateCurrentCardSetProgress,
    loadAllCardSetProgress,
    loadUserProfile,
    updateUserProfile,
  };
};
