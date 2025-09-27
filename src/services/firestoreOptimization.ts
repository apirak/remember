// Firestore Optimization Migration Utility
// Handles consolidation of cardSetProgress documents into user profile
// Provides backward compatibility and error recovery

import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { firestore } from '../utils/firebase';
import type {
  UserProfile,
  CardSetProgress,
  UserProfileWithProgress,
  MigrationResult,
} from '../types/flashcard';

/**
 * Migration service for Firestore read optimization
 * Consolidates fragmented cardSetProgress documents into user profile
 */
export class FirestoreOptimizationMigration {
  /**
   * Migration version for tracking data structure changes
   * Increment when data structure changes to trigger re-migration
   */
  private static readonly CURRENT_MIGRATION_VERSION = 1;

  /**
   * Check if user data needs migration to optimized structure
   * @param userId - The user ID to check
   * @returns Promise<boolean> - True if migration is needed
   */
  static async needsMigration(userId: string): Promise<boolean> {
    try {
      console.log(`Checking if migration is needed for user: ${userId}`);

      // Check user profile document
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('User document does not exist, migration needed');
        return true;
      }

      const userData = userDoc.data();

      // Check if we have the new consolidated structure
      if (
        userData.cardSetsProgress &&
        userData.migrationVersion === this.CURRENT_MIGRATION_VERSION
      ) {
        console.log(
          'User already has optimized structure, no migration needed'
        );
        return false;
      }

      // Check if old cardSetProgress collection exists
      const progressCollectionRef = collection(
        firestore,
        'users',
        userId,
        'cardSetProgress'
      );
      const progressSnapshot = await getDocs(progressCollectionRef);

      // Need migration if old structure exists or new structure is incomplete
      const needsMigration =
        !progressSnapshot.empty || !userData.cardSetsProgress;

      console.log(`Migration needed: ${needsMigration}`);
      return needsMigration;
    } catch (error) {
      console.error('Error checking migration status:', error);
      // Assume migration is needed if we can't determine status
      return true;
    }
  }

  /**
   * Migrate user data to optimized structure
   * Consolidates cardSetProgress documents into user profile
   * @param userId - The user ID to migrate
   * @returns Promise<MigrationResult> - Result of migration operation
   */
  static async migrateToOptimizedStructure(
    userId: string
  ): Promise<MigrationResult> {
    console.log(
      `Starting migration to optimized structure for user: ${userId}`
    );

    const result: MigrationResult = {
      success: false,
      migratedCardSets: [],
      errors: [],
      totalReadOperations: 0,
      totalWriteOperations: 0,
    };

    try {
      // Step 1: Load existing user profile
      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      result.totalReadOperations++;

      let existingProfile: UserProfile | null = null;

      if (userDoc.exists()) {
        existingProfile = userDoc.data() as UserProfile;
        console.log('Found existing user profile');
      } else {
        console.log('No existing user profile found');
      }

      // Step 2: Load all cardSetProgress documents
      const progressCollectionRef = collection(
        firestore,
        'users',
        userId,
        'cardSetProgress'
      );
      const progressSnapshot = await getDocs(progressCollectionRef);
      result.totalReadOperations++;

      console.log(`Found ${progressSnapshot.size} cardSetProgress documents`);

      // Step 3: Consolidate progress data
      const consolidatedProgress: Record<string, CardSetProgress> = {};

      progressSnapshot.forEach((doc) => {
        try {
          const data = doc.data();

          // Validate required fields before processing
          if (!data.cardSetId || typeof data.totalCards !== 'number') {
            throw new Error(`Invalid progress data: missing required fields`);
          }

          const progress: CardSetProgress = {
            cardSetId: data.cardSetId,
            totalCards: data.totalCards,
            reviewedCards: data.reviewedCards || 0,
            progressPercentage: data.progressPercentage || 0,
            lastReviewDate: data.lastReviewDate?.toDate() || null,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          };

          consolidatedProgress[progress.cardSetId] = progress;
          result.migratedCardSets.push(progress.cardSetId);

          console.log(
            `Consolidated progress for card set: ${progress.cardSetId}`
          );
        } catch (error) {
          const errorMsg = `Error processing progress document ${doc.id}: ${error}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          // Do not add to migratedCardSets on error
        }
      });

      // Step 4: Create optimized user profile
      const optimizedProfile: UserProfileWithProgress = {
        ...existingProfile,
        uid: userId,
        email: existingProfile?.email || null,
        displayName: existingProfile?.displayName || null,
        photoURL: existingProfile?.photoURL || null,
        createdAt: existingProfile?.createdAt || new Date(),
        lastLoginAt: new Date(),
        isActive: existingProfile?.isActive ?? true,
        // New optimized fields
        cardSetsProgress: consolidatedProgress,
        migrationVersion: this.CURRENT_MIGRATION_VERSION,
        lastMigrationDate: new Date(),
      };

      // Step 5: Save optimized profile and cleanup using batch
      const batch = writeBatch(firestore);

      // Save the optimized profile
      batch.set(
        userDocRef,
        {
          ...optimizedProfile,
          updatedAt: serverTimestamp(),
          lastMigrationDate: serverTimestamp(),
        },
        { merge: true }
      );
      result.totalWriteOperations++;

      // Delete old cardSetProgress documents
      progressSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        result.totalWriteOperations++;
      });

      // Execute batch operation
      await batch.commit();

      result.success = true;
      console.log(`Migration completed successfully:`, {
        migratedCardSets: result.migratedCardSets.length,
        totalOperations:
          result.totalReadOperations + result.totalWriteOperations,
      });
    } catch (error) {
      const errorMsg = `Migration failed: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      result.success = false;
    }

    return result;
  }

  /**
   * Load optimized user profile with consolidated progress
   * Single read operation instead of N+1 reads
   * @param userId - The user ID to load
   * @returns Promise<UserProfileWithProgress | null> - The optimized profile or null
   */
  static async loadOptimizedProfile(
    userId: string
  ): Promise<UserProfileWithProgress | null> {
    try {
      console.log(`Loading optimized profile for user: ${userId}`);

      const userDocRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('User document does not exist');
        return null;
      }

      const userData = userDoc.data() as UserProfileWithProgress;

      // Ensure we have the consolidated progress structure
      if (!userData.cardSetsProgress) {
        console.log(
          'User profile missing cardSetsProgress, migration may be needed'
        );
        userData.cardSetsProgress = {};
      }

      // Convert Firestore timestamps to Date objects
      if (userData.createdAt && typeof userData.createdAt !== 'object') {
        userData.createdAt = new Date(userData.createdAt);
      }
      if (userData.lastLoginAt && typeof userData.lastLoginAt !== 'object') {
        userData.lastLoginAt = new Date(userData.lastLoginAt);
      }
      if (
        userData.lastMigrationDate &&
        typeof userData.lastMigrationDate !== 'object'
      ) {
        userData.lastMigrationDate = new Date(userData.lastMigrationDate);
      }

      // Convert progress dates
      Object.values(userData.cardSetsProgress).forEach((progress) => {
        if (
          progress.lastReviewDate &&
          typeof progress.lastReviewDate !== 'object'
        ) {
          progress.lastReviewDate = new Date(progress.lastReviewDate);
        }
        if (progress.createdAt && typeof progress.createdAt !== 'object') {
          progress.createdAt = new Date(progress.createdAt);
        }
        if (progress.updatedAt && typeof progress.updatedAt !== 'object') {
          progress.updatedAt = new Date(progress.updatedAt);
        }
      });

      console.log(
        `Loaded profile with ${Object.keys(userData.cardSetsProgress).length} card set progress records`
      );
      return userData;
    } catch (error) {
      console.error('Error loading optimized profile:', error);
      return null;
    }
  }

  /**
   * Update progress for a specific card set in the optimized structure
   * @param userId - The user ID
   * @param cardSetId - The card set ID
   * @param progress - The progress data to update
   * @returns Promise<boolean> - Success status
   */
  static async updateCardSetProgress(
    userId: string,
    cardSetId: string,
    progress: CardSetProgress
  ): Promise<boolean> {
    try {
      console.log(`Updating progress for card set: ${cardSetId}`);

      const userDocRef = doc(firestore, 'users', userId);

      // Update specific card set progress in the consolidated structure
      await setDoc(
        userDocRef,
        {
          [`cardSetsProgress.${cardSetId}`]: {
            ...progress,
            updatedAt: serverTimestamp(),
          },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`Successfully updated progress for card set: ${cardSetId}`);
      return true;
    } catch (error) {
      console.error(
        `Error updating progress for card set ${cardSetId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Perform automatic migration if needed
   * Should be called during app initialization for authenticated users
   * @param userId - The user ID to check and migrate
   * @returns Promise<UserProfileWithProgress | null> - The profile after migration
   */
  static async autoMigrateAndLoadProfile(
    userId: string
  ): Promise<UserProfileWithProgress | null> {
    try {
      console.log(`Auto-migration check for user: ${userId}`);

      // Check if migration is needed
      const needsMigration = await this.needsMigration(userId);

      if (needsMigration) {
        console.log('Starting automatic migration...');
        const migrationResult = await this.migrateToOptimizedStructure(userId);

        if (!migrationResult.success) {
          console.error('Auto-migration failed:', migrationResult.errors);
          // Try to load profile anyway in case partial migration succeeded
        } else {
          console.log('Auto-migration completed successfully');
        }
      }

      // Load the optimized profile
      return await this.loadOptimizedProfile(userId);
    } catch (error) {
      console.error('Error in auto-migration process:', error);
      return null;
    }
  }
}
