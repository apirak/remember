// Enhanced Firestore Integration with Automatic Seeding
// Handles CRUD operations with loading states, error handling, and automatic seeding

import {
  getUserCardSets,
  saveFlashcardsBatch,
  updateFlashcardProgress,
  createUserProfile,
  migrateGuestDataToUser,
  type FirestoreResult,
} from "./firestore";
import { getCurrentUser } from "./auth";
import { shouldSeedUser, generateSeedData, TEST_USER_EMAIL } from "./seedData";
import type { Flashcard, PendingOperation } from "../types/flashcard";

// Enhanced Firestore service with loading states and error handling
export class EnhancedFirestoreService {
  private loadingCallbacks: Map<string, (loading: boolean) => void> = new Map();
  private errorCallback: ((error: string, retryable?: boolean) => void) | null =
    null;
  private syncStatusCallback:
    | ((status: "idle" | "syncing" | "error" | "offline") => void)
    | null = null;

  // Register callbacks for state management
  setLoadingCallback(operation: string, callback: (loading: boolean) => void) {
    this.loadingCallbacks.set(operation, callback);
  }

  setErrorCallback(callback: (error: string, retryable?: boolean) => void) {
    this.errorCallback = callback;
  }

  setSyncStatusCallback(
    callback: (status: "idle" | "syncing" | "error" | "offline") => void
  ) {
    this.syncStatusCallback = callback;
  }

  // Helper methods for state management
  private setLoading(operation: string, loading: boolean) {
    const callback = this.loadingCallbacks.get(operation);
    if (callback) callback(loading);
  }

  private setError(message: string, retryable: boolean = true) {
    if (this.errorCallback) this.errorCallback(message, retryable);
  }

  private setSyncStatus(status: "idle" | "syncing" | "error" | "offline") {
    if (this.syncStatusCallback) this.syncStatusCallback(status);
  }

  // Check if user needs seeding and perform automatic seeding
  async checkAndSeedUser(): Promise<FirestoreResult<Flashcard[]>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to check for seeding.",
        };
      }

      this.setLoading("fetchingCards", true);
      this.setSyncStatus("syncing");

      // Check if user already has any card sets
      const existingCardSetsResult = await getUserCardSets();

      if (
        existingCardSetsResult.success &&
        existingCardSetsResult.data &&
        existingCardSetsResult.data.length > 0
      ) {
        // User already has card sets, no seeding needed
        console.log(
          `User ${currentUser.email} already has ${existingCardSetsResult.data.length} card sets`
        );
        this.setLoading("fetchingCards", false);
        this.setSyncStatus("idle");
        // Return empty since we're just checking for seeding
        return { success: true, data: [] };
      }

      // Check if user should be seeded
      if (shouldSeedUser(currentUser.email || "")) {
        console.log(`Seeding user: ${currentUser.email}`);

        // Generate seed data
        const seedCards = await generateSeedData(currentUser.email || "");

        // Create user profile if it doesn't exist
        await createUserProfile(currentUser.uid, {
          email: currentUser.email,
          displayName: currentUser.displayName,
          seeded: true,
          seedTimestamp: new Date(),
          seedCardCount: seedCards.length,
        });

        // Batch create seed cards - use the cardSetId from the first card or default
        const cardSetId =
          seedCards.length > 0 ? seedCards[0].cardSetId : "default";
        const seedResult = await saveFlashcardsBatch(seedCards, cardSetId);

        if (seedResult.success) {
          console.log(
            `Successfully seeded ${seedCards.length} cards for user ${currentUser.email}`
          );
          this.setLoading("fetchingCards", false);
          this.setSyncStatus("idle");
          return { success: true, data: seedCards };
        } else {
          this.setError(`Failed to seed user data: ${seedResult.error}`, true);
          this.setLoading("fetchingCards", false);
          this.setSyncStatus("error");
          return seedResult;
        }
      }

      // No seeding needed, return empty result
      this.setLoading("fetchingCards", false);
      this.setSyncStatus("idle");
      return { success: true, data: [] };
    } catch (error) {
      console.error("Error in checkAndSeedUser:", error);
      this.setError(
        error instanceof Error ? error.message : "Unknown error occurred",
        true
      );
      this.setLoading("fetchingCards", false);
      this.setSyncStatus("error");
      return { success: false, error: "Failed to check and seed user data." };
    }
  }

  // Load user card sets with automatic seeding
  async loadUserCards(): Promise<FirestoreResult<any[]>> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to load cards.",
        };
      }

      this.setLoading("fetchingCards", true);
      this.setSyncStatus("syncing");

      // First, check and seed if necessary
      const seedResult = await this.checkAndSeedUser();

      if (!seedResult.success) {
        return seedResult;
      }

      // If seeding happened, return success with empty data since we're checking card sets
      if (seedResult.data && seedResult.data.length > 0) {
        this.setLoading("fetchingCards", false);
        this.setSyncStatus("idle");
        return { success: true, data: [] };
      }

      // Otherwise, load existing card sets
      const cardSetsResult = await getUserCardSets();

      this.setLoading("fetchingCards", false);

      if (cardSetsResult.success) {
        this.setSyncStatus("idle");
      } else {
        this.setSyncStatus("error");
        this.setError(cardSetsResult.error || "Failed to load card sets", true);
      }

      return cardSetsResult;
    } catch (error) {
      console.error("Error loading user cards:", error);
      this.setError(
        error instanceof Error ? error.message : "Unknown error occurred",
        true
      );
      this.setLoading("fetchingCards", false);
      this.setSyncStatus("error");
      return { success: false, error: "Failed to load user cards." };
    }
  }

  // Save card progress with optimistic updates support
  async saveCardProgress(card: Flashcard): Promise<FirestoreResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to save progress.",
        };
      }

      this.setLoading("savingProgress", true);
      this.setSyncStatus("syncing");

      const progressData = {
        easinessFactor: card.easinessFactor,
        repetitions: card.repetitions,
        interval: card.interval,
        nextReviewDate: card.nextReviewDate,
        lastReviewDate: card.lastReviewDate,
        totalReviews: card.totalReviews,
        correctStreak: card.correctStreak,
        averageQuality: card.averageQuality,
        isNew: card.isNew,
      };

      const result = await updateFlashcardProgress(
        card.id,
        card.cardSetId,
        progressData
      );

      this.setLoading("savingProgress", false);

      if (result.success) {
        this.setSyncStatus("idle");
      } else {
        this.setSyncStatus("error");
        this.setError(result.error || "Failed to save progress", true);
      }

      return result;
    } catch (error) {
      console.error("Error saving card progress:", error);
      this.setError(
        error instanceof Error ? error.message : "Unknown error occurred",
        true
      );
      this.setLoading("savingProgress", false);
      this.setSyncStatus("error");
      return { success: false, error: "Failed to save card progress." };
    }
  }

  // Migrate guest data with progress tracking
  async migrateGuestData(guestData: any): Promise<FirestoreResult> {
    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return {
          success: false,
          error: "User must be authenticated to migrate data.",
        };
      }

      this.setLoading("migrating", true);
      this.setSyncStatus("syncing");

      const result = await migrateGuestDataToUser(guestData);

      this.setLoading("migrating", false);

      if (result.success) {
        this.setSyncStatus("idle");
        console.log(
          `Successfully migrated ${guestData.cards?.length || 0} guest cards`
        );
      } else {
        this.setSyncStatus("error");
        this.setError(result.error || "Failed to migrate guest data", true);
      }

      return result;
    } catch (error) {
      console.error("Error migrating guest data:", error);
      this.setError(
        error instanceof Error ? error.message : "Unknown error occurred",
        true
      );
      this.setLoading("migrating", false);
      this.setSyncStatus("error");
      return { success: false, error: "Failed to migrate guest data." };
    }
  }

  // Retry failed operations
  async retryOperation(operation: PendingOperation): Promise<FirestoreResult> {
    try {
      console.log(`Retrying operation: ${operation.type}`, operation);

      switch (operation.type) {
        case "rate_card":
          return await this.saveCardProgress(operation.data);

        case "migrate_data":
          return await this.migrateGuestData(operation.data);

        default:
          return {
            success: false,
            error: `Unknown operation type: ${operation.type}`,
          };
      }
    } catch (error) {
      console.error("Error retrying operation:", error);
      this.setError(
        error instanceof Error ? error.message : "Unknown error occurred",
        true
      );
      return { success: false, error: "Failed to retry operation." };
    }
  }

  // Batch retry all pending operations
  async retryAllPendingOperations(
    pendingOperations: PendingOperation[]
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    for (const operation of pendingOperations) {
      const result = await this.retryOperation(operation);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    console.log(`Retry results: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  }
}

// Create singleton instance
export const enhancedFirestoreService = new EnhancedFirestoreService();

// Helper function to check if current user is the test user
export const isTestUser = (): boolean => {
  const currentUser = getCurrentUser();
  return currentUser?.email === TEST_USER_EMAIL;
};

// Export for convenience
export default enhancedFirestoreService;
