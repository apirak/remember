// Flashcard utility functions
// Helper functions for working with flashcard data, statistics, and review logic

import type { Flashcard } from "../types/flashcard";

/**
 * Check if a flashcard is due for review
 * @param card - The flashcard to check
 * @param currentDate - The current date (defaults to now)
 * @returns true if the card is due for review
 */
export const isFlashcardDue = (
  card: Flashcard,
  currentDate: Date = new Date()
): boolean => {
  return card.nextReviewDate <= currentDate;
};

/**
 * Get all flashcards that are due for review
 * @param cards - Array of flashcards to filter
 * @returns Array of cards that are due for review
 */
export const getDueFlashcards = (cards: Flashcard[]): Flashcard[] => {
  const currentDate = new Date();
  return cards.filter((card) => isFlashcardDue(card, currentDate));
};

/**
 * Calculate comprehensive statistics for a collection of flashcards
 * @param cards - Array of flashcards to analyze
 * @returns Statistics object with various metrics
 */
export const calculateFlashcardStats = (cards: Flashcard[]) => {
  const totalCards = cards.length;
  const dueCards = getDueFlashcards(cards).length;

  let masteredCards = 0;
  let difficultCards = 0;
  let totalReviews = 0;

  cards.forEach((card) => {
    // Mastered: has been reviewed at least once with correct answer (repetitions >= 1)
    // and has good easiness factor (>= 2.0) indicating successful learning
    if (card.repetitions >= 1 && card.easinessFactor >= 2.0 && !card.isNew) {
      masteredCards++;
    }

    // Difficult: easiness factor < 2.2 indicating cards that were rated as Hard
    if (card.easinessFactor < 2.2 && card.totalReviews > 0) {
      difficultCards++;
    }

    totalReviews += card.totalReviews;
  });

  // Calculate reviews completed today
  const reviewsToday = calculateReviewsToday(cards);

  return {
    totalCards,
    dueCards,
    masteredCards,
    difficultCards,
    reviewsToday,
    totalReviews,
    averageEasinessFactor:
      cards.length > 0
        ? cards.reduce((sum, card) => sum + card.easinessFactor, 0) /
          cards.length
        : 0,
    averageQuality:
      cards.length > 0
        ? cards.reduce((sum, card) => sum + card.averageQuality, 0) /
          cards.length
        : 0,
  };
};

/**
 * Get flashcards that need review today (helper for dashboard)
 * @param cards - Array of flashcards
 * @returns Object with counts and cards for today's review
 */
export const getTodayReviewData = (cards: Flashcard[]) => {
  const dueCards = getDueFlashcards(cards);
  const newCards = cards.filter((card) => card.isNew);
  const reviewCards = dueCards.filter((card) => !card.isNew);

  return {
    totalDue: dueCards.length,
    newCards: newCards.length,
    reviewCards: reviewCards.length,
    cards: dueCards,
  };
};

/**
 * Check if a card is considered mastered based on SM-2 parameters
 * @param card - The flashcard to check
 * @returns true if the card is mastered
 */
export const isCardMastered = (card: Flashcard): boolean => {
  return card.repetitions >= 1 && card.easinessFactor >= 2.0 && !card.isNew;
};

/**
 * Check if a card is considered difficult based on SM-2 parameters
 * @param card - The flashcard to check
 * @returns true if the card is difficult
 */
export const isCardDifficult = (card: Flashcard): boolean => {
  return card.easinessFactor < 2.2 && card.totalReviews > 0;
};

/**
 * Check if a card was reviewed today based on lastReviewDate
 * @param card - The flashcard to check
 * @param currentDate - The current date (defaults to now)
 * @returns true if the card was reviewed today
 */
export const isCardReviewedToday = (
  card: Flashcard,
  currentDate: Date = new Date()
): boolean => {
  // Handle edge case: if lastReviewDate is invalid, undefined, or null, treat as not reviewed today
  if (!card.lastReviewDate || !(card.lastReviewDate instanceof Date)) {
    return false;
  }

  // Only count as reviewed today if:
  // 1. The card has been actually reviewed (not a new card)
  // 2. The lastReviewDate is today
  // 3. The card is not in "new" state
  if (card.isNew || card.totalReviews === 0) {
    return false;
  }

  // Simple date comparison using toDateString (ignores time, uses local time)
  return card.lastReviewDate.toDateString() === currentDate.toDateString();
};

/**
 * Calculate the number of cards reviewed today
 * @param cards - Array of flashcards to analyze
 * @param currentDate - The current date (defaults to now)
 * @returns Number of cards reviewed today
 */
export const calculateReviewsToday = (
  cards: Flashcard[],
  currentDate: Date = new Date()
): number => {
  const reviewedCards = cards.filter((card) =>
    isCardReviewedToday(card, currentDate)
  );

  return reviewedCards.length;
};

/**
 * Get study session statistics for reporting
 * @param cards - Array of flashcards
 * @param reviewedToday - Number of cards reviewed today
 * @returns Study session statistics
 */
export const getStudySessionStats = (
  cards: Flashcard[],
  reviewedToday: number = 0
) => {
  const stats = calculateFlashcardStats(cards);
  const todayData = getTodayReviewData(cards);

  return {
    ...stats,
    reviewedToday,
    remainingToday: Math.max(0, todayData.totalDue - reviewedToday),
    progressPercentage:
      todayData.totalDue > 0
        ? Math.round((reviewedToday / todayData.totalDue) * 100)
        : 0,
  };
};

/**
 * Calculate card set progress for a collection of flashcards
 * Progress is based on simple percentage: cards reviewed at least once / total cards
 * @param cards - Array of flashcards for a specific card set
 * @param cardSetId - The card set identifier
 * @returns CardSetProgress object with calculated percentage
 */
export const calculateCardSetProgress = (
  cards: Flashcard[],
  cardSetId: string
): import("../types/flashcard").CardSetProgress => {
  const totalCards = cards.length;

  // Count cards that have been reviewed at least once (totalReviews > 0)
  const reviewedCards = cards.filter((card) => card.totalReviews > 0).length;

  // Calculate percentage (0-100)
  const progressPercentage =
    totalCards > 0 ? Math.round((reviewedCards / totalCards) * 100) : 0;

  // Find the most recent review date
  const reviewDates = cards
    .filter((card) => card.lastReviewDate)
    .map((card) => card.lastReviewDate)
    .sort((a, b) => b.getTime() - a.getTime());

  const lastReviewDate = reviewDates.length > 0 ? reviewDates[0] : null;
  const now = new Date();

  return {
    cardSetId,
    totalCards,
    reviewedCards,
    progressPercentage,
    lastReviewDate,
    createdAt: now, // Will be overridden when loading from Firestore
    updatedAt: now,
  };
};

/**
 * Create a Firestore-ready document from CardSetProgress
 * Converts Date objects to Firestore Timestamps for storage
 * @param progress - CardSetProgress object
 * @returns Plain object ready for Firestore storage
 */
export const createFirestoreProgressDocument = (
  progress: import("../types/flashcard").CardSetProgress
) => {
  return {
    cardSetId: progress.cardSetId,
    totalCards: progress.totalCards,
    reviewedCards: progress.reviewedCards,
    progressPercentage: progress.progressPercentage,
    lastReviewDate: progress.lastReviewDate,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
};
