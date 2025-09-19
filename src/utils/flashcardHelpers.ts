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

  return {
    totalCards,
    dueCards,
    masteredCards,
    difficultCards,
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
