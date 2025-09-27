// FlashcardContext Cache Manager
// Implements smart caching layer for optimized Firestore operations

import type {
  UserProfileWithProgress,
  CacheState,
  BatchSyncOperation,
  CardSetProgress,
  Flashcard,
} from '../types/flashcard';
import { FlashcardService } from '../services/flashcardService';

/**
 * Cache manager for FlashcardContext
 * Provides smart caching with batch sync and optimistic updates
 */
export class FlashcardContextCache {
  private static instance: FlashcardContextCache | null = null;
  private cache: CacheState;
  private syncQueue: BatchSyncOperation[] = [];
  private syncTimer: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.cache = this.initializeCache();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): FlashcardContextCache {
    if (!this.instance) {
      this.instance = new FlashcardContextCache();
    }
    return this.instance;
  }

  /**
   * Initialize cache state
   */
  private initializeCache(): CacheState {
    return {
      userProfileWithProgress: null,
      cardSets: {},
      lastSyncTime: null,
      isDirty: false,
      readOperationCount: 0,
      writeOperationCount: 0,
    };
  }

  /**
   * Load user profile with consolidated progress (OPTIMIZED - 1 read)
   * Replaces multiple individual progress loads
   */
  async loadUserProfileWithProgress(): Promise<{
    success: boolean;
    profile: UserProfileWithProgress | null;
    error?: string;
  }> {
    try {
      console.log(
        '🚀 Loading user profile with consolidated progress (1 read operation)'
      );

      const result = await FlashcardService.loadUserProfileWithProgress();
      this.cache.readOperationCount++;

      if (result.success && result.data) {
        this.cache.userProfileWithProgress = result.data;
        this.cache.lastSyncTime = new Date();
        this.cache.isDirty = false;

        console.log(
          `✅ Profile cached with ${Object.keys(result.data.cardSetsProgress).length} card set progress records`
        );

        return {
          success: true,
          profile: result.data,
        };
      } else {
        console.log('⚠️ No profile found or load failed');
        return {
          success: false,
          profile: null,
          error: result.error || 'Failed to load profile',
        };
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
      return {
        success: false,
        profile: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get card set progress from cache (0 reads)
   * Uses cached profile data instead of additional Firestore reads
   */
  getCardSetProgress(cardSetId: string): {
    success: boolean;
    progress: CardSetProgress | null;
    servedFromCache: boolean;
  } {
    if (!this.cache.userProfileWithProgress) {
      console.log(`⚠️ No cached profile available for card set: ${cardSetId}`);
      return {
        success: false,
        progress: null,
        servedFromCache: false,
      };
    }

    const progress =
      this.cache.userProfileWithProgress.cardSetsProgress[cardSetId] || null;

    if (progress) {
      console.log(`🎯 Served progress for ${cardSetId} from cache (0 reads)`);
    } else {
      console.log(`📭 No progress found in cache for ${cardSetId}`);
    }

    return {
      success: true,
      progress,
      servedFromCache: true,
    };
  }

  /**
   * Get all card set progress from cache (0 reads)
   * Returns all progress data without additional Firestore operations
   */
  getAllCardSetProgress(): {
    success: boolean;
    progressMap: Record<string, CardSetProgress>;
    servedFromCache: boolean;
  } {
    if (!this.cache.userProfileWithProgress) {
      return {
        success: false,
        progressMap: {},
        servedFromCache: false,
      };
    }

    const progressMap = this.cache.userProfileWithProgress.cardSetsProgress;

    console.log(
      `🎯 Served ${Object.keys(progressMap).length} progress records from cache (0 reads)`
    );

    return {
      success: true,
      progressMap,
      servedFromCache: true,
    };
  }

  /**
   * Update card set progress optimistically
   * Immediately updates cache and queues sync operation
   */
  updateCardSetProgressOptimistic(
    cardSetId: string,
    progress: CardSetProgress
  ): void {
    if (!this.cache.userProfileWithProgress) {
      console.warn('⚠️ Cannot update progress: no cached profile');
      return;
    }

    console.log(`⚡ Optimistic update for ${cardSetId}`);

    // Immediate optimistic update
    this.cache.userProfileWithProgress.cardSetsProgress[cardSetId] = {
      ...progress,
      updatedAt: new Date(),
    };
    this.cache.isDirty = true;

    // Queue sync operation
    this.queueSyncOperation({
      type: 'progress',
      cardSetId,
      data: progress,
      timestamp: new Date(),
    });

    // Schedule batch sync
    this.scheduleBatchSync();
  }

  /**
   * Cache card set data
   */
  cacheCardSetData(cardSetId: string, cards: Flashcard[]): void {
    this.cache.cardSets[cardSetId] = cards;
    console.log(`📦 Cached ${cards.length} cards for card set: ${cardSetId}`);
  }

  /**
   * Get cached card set data
   */
  getCachedCardSetData(cardSetId: string): Flashcard[] | null {
    const cards = this.cache.cardSets[cardSetId] || null;
    if (cards) {
      console.log(
        `🎯 Served ${cards.length} cards from cache for ${cardSetId}`
      );
    }
    return cards;
  }

  /**
   * Queue sync operation for batch processing
   */
  private queueSyncOperation(operation: BatchSyncOperation): void {
    // Remove any existing operation for the same card set to avoid duplicates
    if (operation.cardSetId) {
      this.syncQueue = this.syncQueue.filter(
        (op) =>
          !(op.type === operation.type && op.cardSetId === operation.cardSetId)
      );
    }

    this.syncQueue.push(operation);
    console.log(
      `📋 Queued ${operation.type} operation (queue size: ${this.syncQueue.length})`
    );
  }

  /**
   * Schedule batch sync with debouncing
   */
  private scheduleBatchSync(): void {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
    }

    this.syncTimer = setTimeout(() => {
      this.performBatchSync();
    }, this.SYNC_INTERVAL);

    console.log(
      `⏰ Batch sync scheduled in ${this.SYNC_INTERVAL / 1000} seconds`
    );
  }

  /**
   * Perform batch sync of queued operations
   */
  async performBatchSync(): Promise<void> {
    if (this.syncQueue.length === 0) {
      console.log('📭 No operations to sync');
      return;
    }

    console.log(
      `🔄 Performing batch sync of ${this.syncQueue.length} operations`
    );

    const progressUpdates: Record<string, CardSetProgress> = {};

    // Group progress updates
    this.syncQueue.forEach((operation) => {
      if (operation.type === 'progress' && operation.cardSetId) {
        progressUpdates[operation.cardSetId] = operation.data;
      }
    });

    try {
      // Batch update progress
      if (Object.keys(progressUpdates).length > 0) {
        const result =
          await FlashcardService.batchUpdateCardSetProgress(progressUpdates);
        this.cache.writeOperationCount++;

        if (result.success) {
          console.log(
            `✅ Batch sync completed for ${Object.keys(progressUpdates).length} progress updates`
          );
          this.cache.isDirty = false;
          this.cache.lastSyncTime = new Date();
        } else {
          throw new Error(result.error || 'Batch update failed');
        }
      }

      // Clear successful operations
      this.syncQueue = [];
    } catch (error) {
      console.error('❌ Batch sync failed:', error);

      // Retry failed operations with exponential backoff
      this.syncQueue.forEach((operation) => {
        operation.retryCount = (operation.retryCount || 0) + 1;
      });

      // Keep operations that haven't exceeded retry limit
      this.syncQueue = this.syncQueue.filter(
        (operation) => (operation.retryCount || 0) < this.MAX_RETRY_ATTEMPTS
      );

      if (this.syncQueue.length > 0) {
        console.log(`🔄 Retrying ${this.syncQueue.length} failed operations`);
        setTimeout(() => this.performBatchSync(), 5000); // Retry in 5 seconds
      }
    }
  }

  /**
   * Force immediate sync
   */
  async forceSyncNow(): Promise<boolean> {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    try {
      await this.performBatchSync();
      return true;
    } catch (error) {
      console.error('❌ Force sync failed:', error);
      return false;
    }
  }

  /**
   * Check if cache is dirty (has unsaved changes)
   */
  isDirty(): boolean {
    return this.cache.isDirty;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    readOperations: number;
    writeOperations: number;
    cachedCardSets: number;
    hasProfile: boolean;
    lastSyncTime: Date | null;
    isDirty: boolean;
    queueSize: number;
  } {
    return {
      readOperations: this.cache.readOperationCount,
      writeOperations: this.cache.writeOperationCount,
      cachedCardSets: Object.keys(this.cache.cardSets).length,
      hasProfile: !!this.cache.userProfileWithProgress,
      lastSyncTime: this.cache.lastSyncTime,
      isDirty: this.cache.isDirty,
      queueSize: this.syncQueue.length,
    };
  }

  /**
   * Clear cache (for logout or reset)
   */
  clearCache(): void {
    console.log('🗑️ Clearing cache');

    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }

    this.cache = this.initializeCache();
    this.syncQueue = [];
  }

  /**
   * Get cached user profile
   */
  getCachedUserProfile(): UserProfileWithProgress | null {
    return this.cache.userProfileWithProgress;
  }

  /**
   * Initialize cache for a user session
   */
  async initializeCacheForUser(): Promise<boolean> {
    console.log('🚀 Initializing cache for user session');

    const result = await this.loadUserProfileWithProgress();

    if (result.success && result.profile) {
      console.log('✅ Cache initialization successful');
      return true;
    } else {
      console.log('⚠️ Cache initialization failed:', result.error);
      return false;
    }
  }

  /**
   * Preload card sets for better performance
   */
  async preloadCardSets(cardSetIds: string[]): Promise<void> {
    console.log(`📦 Preloading ${cardSetIds.length} card sets`);

    for (const cardSetId of cardSetIds) {
      if (!this.cache.cardSets[cardSetId]) {
        try {
          // Use ensureCardSetExists to pre-populate if needed
          await FlashcardService.ensureCardSetExists(
            cardSetId,
            `${cardSetId}.json`
          );

          // Load cards into cache
          const result = await FlashcardService.loadUserFlashcards(cardSetId);
          if (result.success && result.data) {
            this.cacheCardSetData(cardSetId, result.data);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to preload card set ${cardSetId}:`, error);
        }
      }
    }
  }
}

// Export singleton instance
export const flashcardCache = FlashcardContextCache.getInstance();
