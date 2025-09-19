// Flashcard Service Layer
// Centralized service for all Firestore operations related to flashcards
// Provides clean API abstraction from database operations

import type {
  Flashcard,
  FlashcardData,
  PendingOperation,
} from "../types/flashcard";
import {
  getUserFlashcards,
  updateFlashcardProgress,
  saveFlashcard,
  migrateGuestDataToUser,
  saveFlashcardsBatch,
} from "../utils/firestore";
import { getCurrentUser } from "../utils/auth";
import { transformFlashcardData } from "../utils/seedData";
import flashcardsData from "../data/flashcards.json";

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
   * Load all flashcards for the current user from Firestore
   * If user has no cards, initializes with default cards
   * @returns Service result with flashcard array
   */
  static async loadUserFlashcards(): Promise<ServiceResult<Flashcard[]>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to load cards from Firestore.",
        };
      }

      const result = await getUserFlashcards();

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to load cards from Firestore",
        };
      }

      let cards: Flashcard[];

      // If user has no cards in Firestore yet, use default cards and save them
      if (!result.data || result.data.length === 0) {
        console.log(
          "No cards found in Firestore for new user, using default cards"
        );

        // Transform default cards to include SM-2 parameters
        const defaultCards = (flashcardsData as FlashcardData[]).map(
          transformFlashcardData
        );

        // Save default cards to Firestore for the new user
        try {
          const saveResult = await saveFlashcardsBatch(defaultCards);
          if (saveResult.success) {
            console.log(
              "Successfully saved default cards to Firestore for new user"
            );
          } else {
            console.warn(
              "Failed to save default cards to Firestore:",
              saveResult.error
            );
          }
        } catch (batchError) {
          console.warn("Error saving default cards to Firestore:", batchError);
        }

        cards = defaultCards;
      } else {
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
      }

      console.log(`Loaded ${cards.length} cards from Firestore`);
      return {
        success: true,
        data: cards,
      };
    } catch (error) {
      console.error("Error loading cards from Firestore:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load cards from Firestore",
      };
    }
  }

  /**
   * Save a single flashcard to Firestore
   * @param card - The flashcard to save
   * @returns Service result with success status
   */
  static async saveCard(card: Flashcard): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to save cards to Firestore.",
        };
      }

      const result = await saveFlashcard(card);

      if (result.success) {
        console.log(`Saved card ${card.id} to Firestore`);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to save card to Firestore",
        };
      }
    } catch (error) {
      console.error("Error saving card to Firestore:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save card to Firestore",
      };
    }
  }

  /**
   * Update flashcard progress (SM-2 parameters) in Firestore
   * @param cardId - The ID of the card to update
   * @param progressData - The progress data to save
   * @returns Service result with success status
   */
  static async saveProgress(
    cardId: string,
    progressData: any
  ): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to save progress to Firestore.",
        };
      }

      const result = await updateFlashcardProgress(cardId, progressData);

      if (result.success) {
        console.log(`Updated progress for card ${cardId} in Firestore`);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to save progress to Firestore",
        };
      }
    } catch (error) {
      console.error("Error saving progress to Firestore:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save progress to Firestore",
      };
    }
  }

  /**
   * Save multiple flashcards to Firestore in batch
   * @param cards - Array of flashcards to save
   * @returns Service result with success status
   */
  static async saveCardsBatch(cards: Flashcard[]): Promise<ServiceResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to save cards to Firestore.",
        };
      }

      const result = await saveFlashcardsBatch(cards);

      if (result.success) {
        console.log(`Saved ${cards.length} cards to Firestore in batch`);
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to save cards batch to Firestore",
        };
      }
    } catch (error) {
      console.error("Error saving cards batch to Firestore:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to save cards batch to Firestore",
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
          error: "User must be authenticated to migrate data to Firestore.",
        };
      }

      const result = await migrateGuestDataToUser(guestData);

      if (result.success) {
        console.log("Successfully migrated guest data to Firestore");
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || "Failed to migrate guest data to Firestore",
        };
      }
    } catch (error) {
      console.error("Error migrating guest data to Firestore:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to migrate guest data to Firestore",
      };
    }
  }

  /**
   * Get default flashcards (used for fallback or new users)
   * @returns Array of default flashcards with SM-2 parameters
   */
  static getDefaultFlashcards(): Flashcard[] {
    return (flashcardsData as FlashcardData[]).map(transformFlashcardData);
  }

  /**
   * Create a pending operation for offline support
   * @param type - Type of operation
   * @param data - Data for the operation
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Pending operation object
   */
  static createPendingOperation(
    type: PendingOperation["type"],
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
      switch (operation.type) {
        case "add_card":
          return await this.saveCard(operation.data);

        case "rate_card":
          return await this.saveProgress(
            operation.data.cardId,
            operation.data.progressData
          );

        case "edit_card":
          return await this.saveCard(operation.data);

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
          error instanceof Error ? error.message : "Failed to retry operation",
      };
    }
  }
}
