// TypeScript interfaces for Firestore read optimization
// These types support the consolidated data structure to reduce read operations

import type { UserProfile, CardSetProgress } from './flashcard';

/**
 * Enhanced UserProfile with consolidated cardSetsProgress data
 * Replaces the need for individual cardSetProgress/{cardSetId} documents
 *
 * Benefits:
 * - Single read operation instead of N reads for N card sets
 * - Atomic updates for all progress data
 * - Better data locality and consistency
 */
export interface UserProfileWithProgress extends UserProfile {
  // Consolidated progress data for all card sets
  // Key: cardSetId, Value: CardSetProgress data
  cardSetsProgress: Record<string, CardSetProgress>;

  // Migration tracking
  migrationVersion?: number; // Track data structure version for backward compatibility
  lastMigrationDate?: Date; // When the data was last migrated
}

/**
 * Cache state for in-memory storage to minimize Firestore operations
 * Implements smart caching with dirty tracking and batch sync
 */
export interface CacheState {
  // User profile with all progress data (loaded once on startup)
  userProfileWithProgress: UserProfileWithProgress | null;

  // Card sets data cache (loaded as needed)
  cardSets: Record<string, import('./flashcard').Flashcard[]>;

  // Sync tracking
  lastSyncTime: Date | null;
  isDirty: boolean; // Tracks if local changes need to be synced

  // Operation tracking for debugging and optimization
  readOperationCount: number;
  writeOperationCount: number;
}

/**
 * Batch sync operation for efficient Firestore updates
 * Queues multiple operations to be executed together
 */
export interface BatchSyncOperation {
  type: 'progress' | 'cards' | 'profile';
  cardSetId?: string; // For card-specific operations
  data: any;
  timestamp: Date;
  retryCount?: number; // For error handling and retry logic
}

/**
 * Migration result for tracking data structure upgrades
 */
export interface MigrationResult {
  success: boolean;
  migratedCardSets: string[]; // List of card sets that were migrated
  errors: string[]; // Any errors encountered during migration
  totalReadOperations: number; // Track operations used during migration
  totalWriteOperations: number;
}

/**
 * Performance metrics for optimization monitoring
 */
export interface PerformanceMetrics {
  startupReadOperations: number; // Reads during app initialization
  reviewSessionReadOperations: number; // Reads during card review
  totalReadOperations: number;
  totalWriteOperations: number;
  cacheHitRate: number; // Percentage of requests served from cache
  averageResponseTime: number; // Average response time for operations
  timestamp: Date;
}

/**
 * Error recovery state for handling sync failures
 */
export interface ErrorRecoveryState {
  failedOperations: BatchSyncOperation[];
  lastErrorTime: Date | null;
  retryAttempts: number;
  isInRecoveryMode: boolean;
}

/**
 * Enhanced card set metadata with pre-population status
 * Tracks whether card sets have been fully created in Firestore
 */
export interface CardSetMetadata {
  cardSetId: string;
  isPopulated: boolean; // Whether all cards exist in Firestore
  totalCards: number;
  lastPopulationDate?: Date;
  populationVersion?: number; // Track JSON file version used for population
}
