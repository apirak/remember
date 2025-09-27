// Flashcard Service Layer
// Centralized service for all Firestore operations related to flashcards
// Provides clean API abstraction from database operations

import type {
  Flashcard,
  PendingOperation,
  CardSetProgress,
} from '../types/flashcard';
import {
  getUserFlashcards,
  updateFlashcardProgress,
  saveFlashcard,
  migrateGuestDataToUser,
  saveFlashcardsBatch,
} from '../utils/firestore';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
// Fetch-based card set loader for reliable loading
import { loadCardSetDataWithFetch } from '../utils/cardSetLoader';
import { firestore } from '../utils/firebase';
import { getCurrentUser } from '../utils/auth';
import { transformFlashcardData } from '../utils/seedData';
import type { UserProfile, UserProfileWithProgress } from '../types/flashcard';
// Import optimization utilities
import { FirestoreOptimizationMigration } from './firestoreOptimization';

// Service result type with standardized error handling
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Flashcard Service - Handles all flashcard-related Firestore operations
 */
export class FlashcardService {
  /**
   * Load all flashcards for a specific card set from Firestore
   * If user has no cards for this card set, returns empty array (lazy creation)
   * @param cardSetId - The card set identifier
   * @returns Service result with flashcard array
   */
  static async loadUserFlashcards(
    cardSetId: string
  ): Promise<ServiceResult<Flashcard[]>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to load cards from Firestore.',
        };
      }

      const result = await getUserFlashcards(cardSetId);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to load cards from Firestore',
        };
      }

      let cards: Flashcard[] = [];

      // If user has cards in Firestore for this card set, use them
      if (result.data && result.data.length > 0) {
        // Convert existing Firestore data to our Flashcard format
        cards = result.data.map((cardData: any) => ({
          ...cardData,
          // Ensure proper date conversion
          nextReviewDate:
            cardData.nextReviewDate instanceof Date
              ? cardData.nextReviewDate
              : new Date(cardData.nextReviewDate),
          lastReviewDate:
            cardData.lastReviewDate instanceof Date
              ? cardData.lastReviewDate
              : new Date(cardData.lastReviewDate),
          createdAt:
            cardData.createdAt instanceof Date
              ? cardData.createdAt
              : new Date(cardData.createdAt),
          updatedAt:
            cardData.updatedAt instanceof Date
              ? cardData.updatedAt
              : new Date(cardData.updatedAt),
        }));

        console.log(
          `Loaded ${cards.length} cards from Firestore for card set: ${cardSetId}`
        );
      } else {
        console.log(
          `No cards found in Firestore for card set: ${cardSetId}, returning empty array for lazy creation`
        );
      }

      return {
        success: true,
        data: cards,
      };
    } catch (error) {
      console.error('Error loading cards from Firestore:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load cards from Firestore',
      };
    }
  }

  /**
   * Load cards from JSON file for a specific card set
   * Used as fallback or for seeding new card sets
   * @param cardSetDataFile - JSON file name (e.g., "business_chinese.json")
   * @returns Service result with flashcard array
   */
  static async loadCardsFromJSON(
    cardSetDataFile: string
  ): Promise<ServiceResult<Flashcard[]>> {
    try {
      // Use fetch-based loader for reliable dev and production loading
      const fileName = cardSetDataFile.endsWith('.json')
        ? cardSetDataFile
        : `${cardSetDataFile}.json`;

      const cardsData = await loadCardSetDataWithFetch(fileName);

      // Transform to include SM-2 parameters
      const cards = cardsData.map((data) =>
        transformFlashcardData(data, fileName.replace('.json', ''))
      );

      console.log(`Loaded ${cards.length} cards from JSON file: ${fileName}`);
      return {
        success: true,
        data: cards,
      };
    } catch (error) {
      console.error(
        `Error loading cards from JSON file ${cardSetDataFile}:`,
        error
      );
      return {
        success: false,
        error: `Failed to load cards from ${cardSetDataFile}`,
      };
    }
  }

  /**
   * Load cards for a specific card set with simple straightforward logic:
   * 1. Load from Firestore first
   * 2. If empty, create from JSON and save to Firestore
   * 3. Load from Firestore again
   * 4. Return source information
   * @param cardSetId - The card set identifier
   * @param cardSetDataFile - JSON file name for fallback
   * @returns Service result with flashcard array and source info
   */
  static async loadCardSetData(
    cardSetId: string,
    cardSetDataFile: string
  ): Promise<
    ServiceResult<{ cards: Flashcard[]; source: 'firestore' | 'json' }>
  > {
    try {
      console.log(`Loading card set: ${cardSetId} (${cardSetDataFile})`);

      // Step 1: Load from Firestore first
      const firestoreResult = await this.loadUserFlashcards(cardSetId);

      if (
        firestoreResult.success &&
        firestoreResult.data &&
        firestoreResult.data.length > 0
      ) {
        console.log(
          `Found ${firestoreResult.data.length} cards in Firestore for ${cardSetId}`
        );
        return {
          success: true,
          data: {
            cards: firestoreResult.data,
            source: 'firestore',
          },
        };
      }

      console.log(
        `No cards found in Firestore for ${cardSetId}, creating from JSON`
      );

      // Step 2: If empty, create from JSON
      const jsonResult = await this.loadCardsFromJSON(cardSetDataFile);

      if (!jsonResult.success || !jsonResult.data) {
        return {
          success: false,
          error: `Failed to load JSON data for card set ${cardSetId}`,
        };
      }

      // Save JSON cards to Firestore
      const saveResult = await this.saveCardsBatch(jsonResult.data, cardSetId);

      if (!saveResult.success) {
        console.warn(
          `Failed to save cards to Firestore for ${cardSetId}, returning JSON data`
        );
        return {
          success: true,
          data: {
            cards: jsonResult.data,
            source: 'json',
          },
        };
      }

      console.log(
        `Successfully saved ${jsonResult.data.length} cards to Firestore for ${cardSetId}`
      );

      // Step 3: Load from Firestore again to get the saved data
      const reloadResult = await this.loadUserFlashcards(cardSetId);

      if (
        reloadResult.success &&
        reloadResult.data &&
        reloadResult.data.length > 0
      ) {
        console.log(
          `Reloaded ${reloadResult.data.length} cards from Firestore for ${cardSetId}`
        );
        return {
          success: true,
          data: {
            cards: reloadResult.data,
            source: 'firestore',
          },
        };
      }

      // Fallback: return JSON data if reload failed
      return {
        success: true,
        data: {
          cards: jsonResult.data,
          source: 'json',
        },
      };
    } catch (error) {
      console.error(`Error loading card set data for ${cardSetId}:`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load card set data',
      };
    }
  }

  /**
   * Save a single flashcard to Firestore for a specific card set
   * @param card - The flashcard to save
   * @param cardSetId - The card set identifier
   * @returns Service result with success status
   */
  static async saveCard(
    card: Flashcard,
    cardSetId: string
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save cards to Firestore.',
        };
      }

      const result = await saveFlashcard(card, cardSetId);

      if (result.success) {
        console.log(
          `Saved card ${card.id} to Firestore in card set: ${cardSetId}`
        );
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save card to Firestore',
        };
      }
    } catch (error) {
      console.error('Error saving card to Firestore:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save card to Firestore',
      };
    }
  }

  /**
   * Update flashcard progress (SM-2 parameters) in Firestore for a specific card set
   * Supports lazy creation - creates card if it doesn't exist
   * @param cardId - The ID of the card to update
   * @param cardSetId - The card set identifier
   * @param progressData - The progress data to save
   * @returns Service result with success status
   */
  static async saveProgress(
    cardId: string,
    cardSetId: string,
    progressData: any
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save progress to Firestore.',
        };
      }

      const result = await updateFlashcardProgress(
        cardId,
        cardSetId,
        progressData
      );

      if (result.success) {
        console.log(
          `Updated progress for card ${cardId} in Firestore (card set: ${cardSetId})`
        );
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save progress to Firestore',
        };
      }
    } catch (error) {
      console.error('Error saving progress to Firestore:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save progress to Firestore',
      };
    }
  }

  /**
   * Create or update a card with both content and progress data (lazy creation)
   * This is used when user reviews a card for the first time
   * @param cardData - Complete card data including front/back content
   * @param cardSetId - The card set identifier
   * @param progressData - SM-2 progress data from review
   * @returns Service result with success status
   */
  static async saveCardWithProgress(
    cardData: any,
    cardSetId: string,
    progressData: any
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save card with progress.',
        };
      }

      // Combine card data with progress data
      const completeCardData = {
        ...cardData,
        ...progressData,
        cardSetId,
        id: cardData.id,
        // Ensure required fields are present
        front: cardData.front || { icon: '', title: '', description: '' },
        back: cardData.back || { icon: '', title: '', description: '' },
      };

      const result = await updateFlashcardProgress(
        cardData.id,
        cardSetId,
        completeCardData
      );

      if (result.success) {
        console.log(
          `Lazy creation: Saved card ${cardData.id} with progress in card set: ${cardSetId}`
        );
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save card with progress',
        };
      }
    } catch (error) {
      console.error('Error saving card with progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save card with progress',
      };
    }
  }

  /**
   * Save multiple card progress updates in batch operation (OPTIMIZATION)
   * Used at end of review session to minimize Firestore operations
   * @param progressUpdates - Map of cardId -> progress data
   * @param cardSetId - The card set identifier
   * @returns Service result with success status
   */
  static async saveProgressBatch(
    progressUpdates: Map<string, any>,
    cardSetId: string
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error:
            'User must be authenticated to save progress batch to Firestore.',
        };
      }

      if (progressUpdates.size === 0) {
        console.log('No progress updates to save in batch');
        return { success: true, data: [] };
      }

      console.log(
        `Batch saving progress for ${progressUpdates.size} cards in card set: ${cardSetId}`
      );

      // Convert Map to array format expected by saveFlashcardsBatch
      const progressArray = Array.from(progressUpdates.entries()).map(
        ([cardId, progressData]) => ({
          id: cardId,
          ...progressData,
          cardSetId,
        })
      );

      const result = await saveFlashcardsBatch(progressArray, cardSetId);

      if (result.success) {
        console.log(
          `Successfully batch saved progress for ${progressArray.length} cards`
        );
        return { success: true, data: result.data };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to batch save progress to Firestore',
        };
      }
    } catch (error) {
      console.error('Error batch saving progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to batch save progress to Firestore',
      };
    }
  }

  /**
   * Save multiple flashcards to Firestore in batch for a specific card set
   * @param cards - Array of flashcards to save
   * @param cardSetId - The card set identifier
   * @returns Service result with success status
   */
  static async saveCardsBatch(
    cards: Flashcard[],
    cardSetId: string
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save cards to Firestore.',
        };
      }

      const result = await saveFlashcardsBatch(cards, cardSetId);

      if (result.success) {
        console.log(
          `Saved ${cards.length} cards to Firestore in batch (card set: ${cardSetId})`
        );
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to save cards batch to Firestore',
        };
      }
    } catch (error) {
      console.error('Error saving cards batch to Firestore:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save cards batch to Firestore',
      };
    }
  }

  /**
   * Migrate guest data to authenticated user's Firestore account
   * @param guestData - The guest data to migrate
   * @returns Service result with success status
   */
  static async migrateGuestData(guestData: any): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to migrate data to Firestore.',
        };
      }

      const result = await migrateGuestDataToUser(guestData);

      if (result.success) {
        console.log('Successfully migrated guest data to Firestore');
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to migrate guest data to Firestore',
        };
      }
    } catch (error) {
      console.error('Error migrating guest data to Firestore:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to migrate guest data to Firestore',
      };
    }
  }

  /**
   * Get default flashcards for fallback or testing purposes
   * @returns Default flashcard array
   */
  static async getDefaultFlashcards(): Promise<Flashcard[]> {
    const defaultCardsData = await loadCardSetDataWithFetch('flashcards.json');
    return defaultCardsData.map((data) =>
      transformFlashcardData(data, 'default')
    );
  }
  /**
   * Create a pending operation for offline support
   * @param type - Type of operation
   * @param data - Data for the operation
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Pending operation object
   */
  static createPendingOperation(
    type: PendingOperation['type'],
    data: any,
    maxRetries: number = 3
  ): PendingOperation {
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries,
    };
  }

  /**
   * Retry a pending operation
   * @param operation - The pending operation to retry
   * @returns Service result with success status
   */
  static async retryOperation(
    operation: PendingOperation
  ): Promise<ServiceResult> {
    try {
      const cardSetId = operation.data?.cardSetId;

      if (!cardSetId) {
        return {
          success: false,
          error: 'Missing cardSetId in pending operation data',
        };
      }

      switch (operation.type) {
        case 'add_card':
          return await this.saveCard(operation.data, cardSetId);

        case 'rate_card':
          return await this.saveProgress(
            operation.data.cardId,
            cardSetId,
            operation.data.progressData
          );

        case 'edit_card':
          return await this.saveCard(operation.data, cardSetId);

        default:
          return {
            success: false,
            error: `Unknown operation type: ${operation.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to retry operation',
      };
    }
  }

  /**
   * Load card set progress from Firestore for a specific card set
   * @param cardSetId - The card set identifier
   * @returns Service result with CardSetProgress data
   */
  static async loadCardSetProgress(
    cardSetId: string
  ): Promise<ServiceResult<CardSetProgress | null>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to load progress from Firestore.',
        };
      }

      console.log(`Loading card set progress for: ${cardSetId}`);

      // Get progress document from Firestore
      const progressDoc = doc(
        firestore,
        'users',
        currentUser.uid,
        'cardSetProgress',
        cardSetId
      );

      const docSnapshot = await getDoc(progressDoc);

      if (!docSnapshot.exists()) {
        console.log(`No progress found for card set: ${cardSetId}`);
        return {
          success: true,
          data: null, // No progress data exists yet
        };
      }

      const data = docSnapshot.data();

      // Convert Firestore timestamps back to Date objects
      const progress: CardSetProgress = {
        cardSetId: data.cardSetId,
        totalCards: data.totalCards,
        reviewedCards: data.reviewedCards,
        progressPercentage: data.progressPercentage,
        lastReviewDate: data.lastReviewDate
          ? data.lastReviewDate.toDate()
          : null,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
      };

      console.log(
        `Loaded progress for ${cardSetId}: ${progress.progressPercentage}% (${progress.reviewedCards}/${progress.totalCards})`
      );

      return {
        success: true,
        data: progress,
      };
    } catch (error) {
      console.error('Error loading card set progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load card set progress',
      };
    }
  }

  /**
   * Save card set progress to Firestore
   * @param progress - CardSetProgress object to save
   * @returns Service result indicating success/failure
   */
  static async saveCardSetProgress(
    progress: CardSetProgress
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save progress to Firestore.',
        };
      }

      console.log(
        `Saving card set progress for: ${progress.cardSetId} (${progress.progressPercentage}%)`
      );
      console.log('User UID:', currentUser.uid);
      console.log('Progress data:', {
        cardSetId: progress.cardSetId,
        totalCards: progress.totalCards,
        reviewedCards: progress.reviewedCards,
        progressPercentage: progress.progressPercentage,
      });

      // Prepare Firestore document data
      const progressDoc = doc(
        firestore,
        'users',
        currentUser.uid,
        'cardSetProgress',
        progress.cardSetId
      );

      // Convert dates to Firestore timestamps
      const documentData = {
        cardSetId: progress.cardSetId,
        totalCards: progress.totalCards,
        reviewedCards: progress.reviewedCards,
        progressPercentage: progress.progressPercentage,
        lastReviewDate: progress.lastReviewDate,
        createdAt: progress.createdAt,
        updatedAt: serverTimestamp(), // Use server timestamp for consistency
      };

      await setDoc(progressDoc, documentData);

      console.log(
        `Successfully saved progress for ${progress.cardSetId}: ${progress.reviewedCards}/${progress.totalCards} cards (${progress.progressPercentage}%)`
      );

      return {
        success: true,
      };
    } catch (error) {
      console.error('Error saving card set progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save card set progress',
      };
    }
  }

  /**
   * Load progress for all card sets for the current user
   * @returns Service result with array of CardSetProgress
   */
  static async loadAllCardSetProgress(): Promise<
    ServiceResult<CardSetProgress[]>
  > {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to load progress from Firestore.',
        };
      }

      console.log('Loading all card set progress for user');

      // Query all progress documents for the user
      const progressCollection = collection(
        firestore,
        'users',
        currentUser.uid,
        'cardSetProgress'
      );

      const querySnapshot = await getDocs(progressCollection);

      const allProgress: CardSetProgress[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const progress: CardSetProgress = {
          cardSetId: data.cardSetId,
          totalCards: data.totalCards,
          reviewedCards: data.reviewedCards,
          progressPercentage: data.progressPercentage,
          lastReviewDate: data.lastReviewDate
            ? data.lastReviewDate.toDate()
            : null,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
        };
        allProgress.push(progress);
      });

      console.log(`Loaded progress for ${allProgress.length} card sets`);

      return {
        success: true,
        data: allProgress,
      };
    } catch (error) {
      console.error('Error loading all card set progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load card set progress',
      };
    }
  }

  /**
   * Create or update user profile in Firestore
   * Auto-saves user profile data from Google authentication
   * @param userProfile - UserProfile object to save
   * @returns Service result with success status
   */
  static async saveUserProfile(
    userProfile: UserProfile
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to save profile to Firestore.',
        };
      }

      // Ensure profile ID matches the authenticated user ID
      if (userProfile.uid !== currentUser.uid) {
        return {
          success: false,
          error: 'Profile UID must match authenticated user ID.',
        };
      }

      console.log('Saving user profile for:', currentUser.uid);

      // Reference to user profile document
      const profileDocRef = doc(
        firestore,
        'users',
        currentUser.uid,
        'profile',
        currentUser.uid
      );

      // Prepare Firestore document data with server timestamps
      const profileData = {
        uid: userProfile.uid,
        email: userProfile.email,
        displayName: userProfile.displayName,
        photoURL: userProfile.photoURL,
        createdAt: userProfile.createdAt || serverTimestamp(),
        lastLoginAt: serverTimestamp(), // Always update last login
        totalReviewsCount: userProfile.totalReviewsCount || 0,
        preferredLanguage: userProfile.preferredLanguage || 'en',
        theme: userProfile.theme || 'system',
        migratedFromGuest: userProfile.migratedFromGuest || false,
        migrationDate: userProfile.migrationDate || null,
        isActive:
          userProfile.isActive !== undefined ? userProfile.isActive : true,
        updatedAt: serverTimestamp(),
      };

      // Save to Firestore with merge to preserve existing data
      await setDoc(profileDocRef, profileData, { merge: true });

      console.log('Successfully saved user profile');
      return { success: true };
    } catch (error) {
      console.error('Error saving user profile:', error);

      // Check if it's a permission error and provide helpful message
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const isPermissionError = errorMessage.includes(
        'Missing or insufficient permissions'
      );

      if (isPermissionError) {
        console.warn(
          'Firestore rules may not be deployed yet. User profile save failed due to permissions.'
        );
        return {
          success: false,
          error:
            'Firestore permissions not configured yet. User profile will be created later.',
        };
      }

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save user profile to Firestore',
      };
    }
  }

  /**
   * Load user profile from Firestore
   * @param userId - User ID to load profile for (optional, uses current user if not provided)
   * @returns Service result with UserProfile object
   */
  static async loadUserProfile(
    userId?: string
  ): Promise<ServiceResult<UserProfile | null>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to load profile from Firestore.',
        };
      }

      // Use provided userId or current user's ID
      const targetUserId = userId || currentUser.uid;

      // Security: Only allow loading own profile for now
      if (targetUserId !== currentUser.uid) {
        return {
          success: false,
          error: 'Can only load own profile data.',
        };
      }

      console.log('Loading user profile for:', targetUserId);

      // Reference to user profile document
      const profileDocRef = doc(
        firestore,
        'users',
        targetUserId,
        'profile',
        targetUserId
      );

      const profileDoc = await getDoc(profileDocRef);

      if (!profileDoc.exists()) {
        console.log('No user profile found, returning null');
        return { success: true, data: null };
      }

      const data = profileDoc.data();

      // Transform Firestore data to UserProfile type
      const userProfile: UserProfile = {
        uid: data.uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
        totalReviewsCount: data.totalReviewsCount || 0,
        preferredLanguage: data.preferredLanguage || 'en',
        theme: data.theme || 'system',
        migratedFromGuest: data.migratedFromGuest || false,
        migrationDate: data.migrationDate?.toDate() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      };

      console.log('Successfully loaded user profile');
      return { success: true, data: userProfile };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load user profile from Firestore',
      };
    }
  }

  /**
   * Update user profile fields (partial update)
   * @param updates - Partial UserProfile object with fields to update
   * @returns Service result with success status
   */
  static async updateUserProfile(
    updates: Partial<UserProfile>
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to update profile.',
        };
      }

      console.log('Updating user profile for:', currentUser.uid);

      // Reference to user profile document
      const profileDocRef = doc(
        firestore,
        'users',
        currentUser.uid,
        'profile',
        currentUser.uid
      );

      // Prepare update data with server timestamp
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp(),
        // Security: Prevent changing uid
        uid: currentUser.uid,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if ((updateData as any)[key] === undefined) {
          delete (updateData as any)[key];
        }
      });

      // Update Firestore document
      await setDoc(profileDocRef, updateData, { merge: true });

      console.log('Successfully updated user profile');
      return { success: true };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update user profile',
      };
    }
  }

  /**
   * Collect and migrate guest data to authenticated user account
   * Gathers data from in-memory state and localStorage, then migrates to Firestore
   * @param guestCards - Current flashcard state from context
   * @param guestStats - Current statistics from context
   * @returns Service result with migration status
   */
  static async migrateGuestToAuthenticatedUser(
    guestCards: Flashcard[],
    guestStats?: any
  ): Promise<
    ServiceResult<{ migratedCards: number; migratedProgress: number }>
  > {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to migrate guest data.',
        };
      }

      console.log('Starting guest to authenticated user migration...');
      console.log('Guest cards to migrate:', guestCards?.length || 0);

      // Validate guest data
      if (!guestCards || guestCards.length === 0) {
        console.log('No guest cards found to migrate');
        return {
          success: true,
          data: { migratedCards: 0, migratedProgress: 0 },
        };
      }

      // Filter cards that have meaningful progress (modified from defaults)
      const cardsWithProgress = guestCards.filter((card) => {
        // Check if card has been reviewed (most reliable indicator)
        if (card.totalReviews > 0) return true;

        // Check if easiness factor has been modified from default
        if (card.easinessFactor !== 2.5) return true;

        // Check if interval has been modified from default
        if (card.interval !== 1) return true;

        // Check if card is no longer new (has been encountered)
        if (card.isNew === false) return true;

        // Default: no meaningful progress
        return false;
      });

      console.log('Cards with meaningful progress:', cardsWithProgress.length);

      // Get the selected card set from localStorage for context
      let targetCardSetId = 'default';
      try {
        const storedCardSet = localStorage.getItem('remember_last_card_set');
        if (storedCardSet) {
          const cardSetData = JSON.parse(storedCardSet);
          targetCardSetId = cardSetData.id || 'default';
        }
      } catch (error) {
        console.warn('Could not determine card set from localStorage:', error);
      }

      // Prepare guest data for migration
      const guestData = {
        cards: cardsWithProgress,
        cardSetId: targetCardSetId,
        stats: guestStats || {},
        migrationTimestamp: new Date().toISOString(),
      };

      // Call existing migration function
      const migrationResult = await this.migrateGuestData(guestData);

      if (migrationResult.success) {
        // Clear guest data from localStorage after successful migration
        try {
          localStorage.removeItem('remember_last_card_set');
          console.log('Cleared guest data from localStorage');
        } catch (error) {
          console.warn('Could not clear localStorage after migration:', error);
        }

        console.log(
          `✅ Successfully migrated ${cardsWithProgress.length} cards with progress`
        );

        return {
          success: true,
          data: {
            migratedCards: guestCards.length,
            migratedProgress: cardsWithProgress.length,
          },
        };
      } else {
        return {
          success: false,
          error: migrationResult.error || 'Migration failed',
        };
      }
    } catch (error) {
      console.error('Error during guest to authenticated migration:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to migrate guest data',
      };
    }
  }

  // ========================================
  // OPTIMIZED FIRESTORE OPERATIONS
  // ========================================
  // These methods implement the consolidated data structure
  // to reduce Firestore read operations by 70-80%

  /**
   * Load user profile with consolidated progress data (OPTIMIZED)
   * Replaces loadAllCardSetProgress() - Single read instead of N+1 reads
   * Automatically handles migration if needed
   * @returns Service result with user profile including all progress data
   */
  static async loadUserProfileWithProgress(): Promise<
    ServiceResult<UserProfileWithProgress | null>
  > {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to load profile from Firestore.',
        };
      }

      console.log(
        `Loading optimized profile with consolidated progress for user: ${currentUser.uid}`
      );

      // Use optimization utility for automatic migration and loading
      const profile =
        await FirestoreOptimizationMigration.autoMigrateAndLoadProfile(
          currentUser.uid
        );

      if (profile) {
        console.log(
          `Loaded profile with ${Object.keys(profile.cardSetsProgress).length} card set progress records`
        );
        return {
          success: true,
          data: profile,
        };
      } else {
        console.log('No profile found or migration failed');
        return {
          success: true,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error loading optimized profile:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load user profile with progress',
      };
    }
  }

  /**
   * Get card set progress from consolidated profile (OPTIMIZED)
   * Replaces loadCardSetProgress() - No additional reads, uses cached profile
   * @param cardSetId - The card set identifier
   * @param profile - The user profile with consolidated progress (from loadUserProfileWithProgress)
   * @returns Service result with card set progress or null
   */
  static getCardSetProgressFromProfile(
    cardSetId: string,
    profile: UserProfileWithProgress
  ): ServiceResult<CardSetProgress | null> {
    try {
      const progress = profile.cardSetsProgress[cardSetId] || null;

      if (progress) {
        console.log(
          `Retrieved progress for card set ${cardSetId} from consolidated profile`
        );
        return {
          success: true,
          data: progress,
        };
      } else {
        console.log(
          `No progress found for card set ${cardSetId} in consolidated profile`
        );
        return {
          success: true,
          data: null,
        };
      }
    } catch (error) {
      console.error('Error retrieving progress from profile:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve progress from profile',
      };
    }
  }

  /**
   * Update card set progress in consolidated structure (OPTIMIZED)
   * Replaces individual progress document updates - More efficient atomic updates
   * @param cardSetId - The card set identifier
   * @param progress - The progress data to update
   * @returns Service result with success status
   */
  static async updateCardSetProgressOptimized(
    cardSetId: string,
    progress: CardSetProgress
  ): Promise<ServiceResult<boolean>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to update progress in Firestore.',
        };
      }

      console.log(
        `Updating progress for card set ${cardSetId} using optimized method`
      );

      const success =
        await FirestoreOptimizationMigration.updateCardSetProgress(
          currentUser.uid,
          cardSetId,
          progress
        );

      if (success) {
        console.log(`Successfully updated progress for card set: ${cardSetId}`);
        return {
          success: true,
          data: true,
        };
      } else {
        return {
          success: false,
          error: 'Failed to update progress in optimized structure',
        };
      }
    } catch (error) {
      console.error('Error updating optimized progress:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update card set progress',
      };
    }
  }

  /**
   * Ensure card set exists with pre-population (OPTIMIZED)
   * Eliminates lazy creation pattern - Creates complete card sets from JSON
   * Reduces review session reads to zero by pre-populating all cards
   * @param cardSetId - The card set identifier
   * @param cardSetDataFile - JSON file name for card data
   * @returns Service result with success status
   */
  static async ensureCardSetExists(
    cardSetId: string,
    cardSetDataFile: string
  ): Promise<ServiceResult<boolean>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to create card sets in Firestore.',
        };
      }

      console.log(`Ensuring card set exists: ${cardSetId}`);

      // Check if card set already exists (optimized check)
      const existingCards = await this.loadUserFlashcards(cardSetId);

      if (
        existingCards.success &&
        existingCards.data &&
        existingCards.data.length > 0
      ) {
        console.log(
          `Card set ${cardSetId} already exists with ${existingCards.data.length} cards`
        );
        return {
          success: true,
          data: true,
        };
      }

      console.log(
        `Card set ${cardSetId} does not exist, creating from JSON: ${cardSetDataFile}`
      );

      // Load cards from JSON file
      const jsonResult = await this.loadCardsFromJSON(cardSetDataFile);
      if (!jsonResult.success || !jsonResult.data) {
        return {
          success: false,
          error: jsonResult.error || 'Failed to load cards from JSON',
        };
      }

      const cardsToCreate = jsonResult.data.map((cardData) => ({
        ...cardData,
        cardSetId,
        // Initialize with default SM-2 parameters
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        totalReviews: 0,
        correctStreak: 0,
        averageQuality: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isNew: true,
      }));

      // Save all cards in batch to Firestore
      const batchResult = await this.saveCardsBatch(cardsToCreate, cardSetId);

      if (batchResult.success) {
        console.log(
          `Pre-populated card set ${cardSetId} with ${cardsToCreate.length} cards`
        );

        // Initialize progress tracking for this card set
        const initialProgress: CardSetProgress = {
          cardSetId,
          totalCards: cardsToCreate.length,
          reviewedCards: 0,
          progressPercentage: 0,
          lastReviewDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const progressResult = await this.updateCardSetProgressOptimized(
          cardSetId,
          initialProgress
        );

        if (progressResult.success) {
          console.log(
            `Initialized progress tracking for card set: ${cardSetId}`
          );
        } else {
          console.warn(
            `Card set created but progress initialization failed: ${progressResult.error}`
          );
        }

        return {
          success: true,
          data: true,
        };
      } else {
        return {
          success: false,
          error: batchResult.error || 'Failed to save card set batch',
        };
      }
    } catch (error) {
      console.error('Error ensuring card set exists:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to ensure card set exists',
      };
    }
  }

  /**
   * Get all card set progress from consolidated profile (OPTIMIZED)
   * Replaces loadAllCardSetProgress() - Uses already loaded profile data
   * @param profile - The user profile with consolidated progress
   * @returns Service result with array of all progress data
   */
  static getAllCardSetProgressFromProfile(
    profile: UserProfileWithProgress
  ): ServiceResult<CardSetProgress[]> {
    try {
      const allProgress = Object.values(profile.cardSetsProgress);

      console.log(
        `Retrieved ${allProgress.length} card set progress records from consolidated profile`
      );

      return {
        success: true,
        data: allProgress,
      };
    } catch (error) {
      console.error('Error retrieving all progress from profile:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve all progress from profile',
      };
    }
  }

  /**
   * Batch update multiple card set progress records (OPTIMIZED)
   * More efficient than individual updates - Single atomic transaction
   * @param progressUpdates - Map of cardSetId to progress data
   * @returns Service result with success status
   */
  static async batchUpdateCardSetProgress(
    progressUpdates: Record<string, CardSetProgress>
  ): Promise<ServiceResult<boolean>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to update progress in Firestore.',
        };
      }

      console.log(
        `Batch updating progress for ${Object.keys(progressUpdates).length} card sets`
      );

      // Use Firestore batch operation for atomic updates
      const userDocRef = doc(firestore, 'users', currentUser.uid);

      const updateData: any = {
        updatedAt: serverTimestamp(),
      };

      // Add each progress update to the batch
      Object.entries(progressUpdates).forEach(([cardSetId, progress]) => {
        updateData[`cardSetsProgress.${cardSetId}`] = {
          ...progress,
          updatedAt: serverTimestamp(),
        };
      });

      await setDoc(userDocRef, updateData, { merge: true });

      console.log(
        `Successfully batch updated progress for ${Object.keys(progressUpdates).length} card sets`
      );

      return {
        success: true,
        data: true,
      };
    } catch (error) {
      console.error('Error in batch progress update:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to batch update progress',
      };
    }
  }

  // ========================================
  // MIGRATION UTILITIES
  // ========================================

  /**
   * Check if user needs data migration to optimized structure
   * @returns Service result with migration status
   */
  static async checkMigrationStatus(): Promise<
    ServiceResult<{ needsMigration: boolean; reason: string }>
  > {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to check migration status.',
        };
      }

      const needsMigration =
        await FirestoreOptimizationMigration.needsMigration(currentUser.uid);

      return {
        success: true,
        data: {
          needsMigration,
          reason: needsMigration
            ? 'User data needs migration to optimized structure'
            : 'User already has optimized data structure',
        },
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check migration status',
      };
    }
  }

  /**
   * Manually trigger migration to optimized structure
   * @returns Service result with migration details
   */
  static async triggerMigration(): Promise<ServiceResult<any>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: 'User must be authenticated to trigger migration.',
        };
      }

      console.log('Manually triggering migration to optimized structure');

      const migrationResult =
        await FirestoreOptimizationMigration.migrateToOptimizedStructure(
          currentUser.uid
        );

      if (migrationResult.success) {
        console.log('Migration completed successfully:', migrationResult);
        return {
          success: true,
          data: migrationResult,
        };
      } else {
        return {
          success: false,
          error: `Migration failed: ${migrationResult.errors.join(', ')}`,
        };
      }
    } catch (error) {
      console.error('Error triggering migration:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to trigger migration',
      };
    }
  }
}
