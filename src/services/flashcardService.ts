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
          error: "User must be authenticated to load cards from Firestore.",
        };
      }

      const result = await getUserFlashcards(cardSetId);

      if (!result.success) {
        return {
          success: false,
          error: result.error || "Failed to load cards from Firestore",
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
   * Load cards from JSON file for a specific card set
   * Used as fallback or for seeding new card sets
   * @param cardSetDataFile - JSON file name (e.g., "business_chinese.json")
   * @returns Service result with flashcard array
   */
  static async loadCardsFromJSON(
    cardSetDataFile: string
  ): Promise<ServiceResult<Flashcard[]>> {
    try {
      // Dynamically import the card set data
      const cardSetData = await import(`../data/${cardSetDataFile}`);
      const cardsData = cardSetData.default as FlashcardData[];

      // Transform to include SM-2 parameters
      const cards = cardsData.map((data) =>
        transformFlashcardData(data, cardSetDataFile.replace(".json", ""))
      );

      console.log(
        `Loaded ${cards.length} cards from JSON file: ${cardSetDataFile}`
      );
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
   * Load cards for a specific card set (Firestore first, then JSON fallback)
   * @param cardSetId - The card set identifier
   * @param cardSetDataFile - JSON file name for fallback
   * @returns Service result with flashcard array and source info
   */
  static async loadCardSetData(
    cardSetId: string,
    cardSetDataFile: string
  ): Promise<
    ServiceResult<{ cards: Flashcard[]; source: "firestore" | "json" }>
  > {
    try {
      // First, try to load from Firestore
      const firestoreResult = await this.loadUserFlashcards(cardSetId);

      if (
        firestoreResult.success &&
        firestoreResult.data &&
        firestoreResult.data.length > 0
      ) {
        return {
          success: true,
          data: {
            cards: firestoreResult.data,
            source: "firestore",
          },
        };
      }

      // If no Firestore data, load from JSON
      const jsonResult = await this.loadCardsFromJSON(cardSetDataFile);

      if (jsonResult.success) {
        return {
          success: true,
          data: {
            cards: jsonResult.data || [],
            source: "json",
          },
        };
      }

      return {
        success: false,
        error: `Failed to load cards for card set ${cardSetId} from both Firestore and JSON`,
      };
    } catch (error) {
      console.error(`Error loading card set data for ${cardSetId}:`, error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load card set data",
      };
    }
  }

  /**
   * Legacy method - will be removed after migration
   * @deprecated Use loadCardSetData instead
   */
  static async loadUserFlashcardsLegacy(): Promise<ServiceResult<Flashcard[]>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to load cards from Firestore.",
        };
      }

      // Use default card set for legacy support
      const defaultCardSetId = "chinese_essentials_1";
      const result = await getUserFlashcards(defaultCardSetId);

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
        const defaultCards = (flashcardsData as FlashcardData[]).map((data) =>
          transformFlashcardData(data, "default")
        );

        // Save default cards to Firestore for the new user
        try {
          const saveResult = await saveFlashcardsBatch(
            defaultCards,
            defaultCardSetId
          );
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
          error: "User must be authenticated to save cards to Firestore.",
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
   * Update flashcard progress (SM-2 parameters) in Firestore for a specific card set
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
          error: "User must be authenticated to save progress to Firestore.",
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
          error: "User must be authenticated to save cards to Firestore.",
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
    return (flashcardsData as FlashcardData[]).map((data) =>
      transformFlashcardData(data, "default")
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
      // For legacy operations without cardSetId, use default
      const cardSetId = operation.data?.cardSetId || "chinese_essentials_1";

      switch (operation.type) {
        case "add_card":
          return await this.saveCard(operation.data, cardSetId);

        case "rate_card":
          return await this.saveProgress(
            operation.data.cardId,
            cardSetId,
            operation.data.progressData
          );

        case "edit_card":
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
          error instanceof Error ? error.message : "Failed to retry operation",
      };
    }
  }
}
