// SM-2 Spaced Repetition Algorithm Implementation
// Based on the SuperMemo-2 algorithm for optimal flashcard scheduling

import { addDays, isAfter, startOfDay, differenceInDays } from "date-fns";

// Quality ratings for SM-2 algorithm (0-5 scale)
export const QUALITY_RATINGS = {
  AGAIN: 0, // Complete blackout - "Ask Me Again"
  HARD: 2, // Incorrect response with correct one being easy to recall - "Hard"
  GOOD: 4, // Correct response with some hesitation - "Got It"
  EASY: 5, // Perfect response - "I Know" button
} as const;

export type QualityRating =
  (typeof QUALITY_RATINGS)[keyof typeof QUALITY_RATINGS];

// SM-2 algorithm parameters
export interface SM2Parameters {
  easinessFactor: number; // E-Factor (1.3 - 2.5)
  repetitions: number; // Number of consecutive correct responses
  interval: number; // Days until next review
  nextReviewDate: Date; // When the card should be reviewed next
  lastReviewDate: Date; // When the card was last reviewed
  totalReviews: number; // Total number of times reviewed
  correctStreak: number; // Current streak of correct answers
  averageQuality: number; // Running average of quality ratings
}

// SM-2 algorithm result
export interface SM2Result {
  easinessFactor: number;
  repetitions: number;
  interval: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
  totalReviews: number;
  correctStreak: number;
  averageQuality: number;
  shouldRepeatToday: boolean; // True if quality < 3 (needs immediate retry)
}

// Default SM-2 parameters for new cards
export const DEFAULT_SM2_PARAMS: SM2Parameters = {
  easinessFactor: 2.5,
  repetitions: 0,
  interval: 1,
  nextReviewDate: new Date(),
  lastReviewDate: new Date(),
  totalReviews: 0,
  correctStreak: 0,
  averageQuality: 0,
};

// SM-2 algorithm constants
const MIN_EASINESS_FACTOR = 1.3;
const MAX_EASINESS_FACTOR = 2.5;

/**
 * Calculate the new easiness factor based on quality rating
 * Formula: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
 */
const calculateEasinessFactor = (
  currentEF: number,
  quality: QualityRating
): number => {
  const newEF =
    currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Clamp the easiness factor between min and max values
  return Math.max(MIN_EASINESS_FACTOR, Math.min(MAX_EASINESS_FACTOR, newEF));
};

/**
 * Calculate the next interval based on repetitions and easiness factor
 */
const calculateInterval = (
  repetitions: number,
  easinessFactor: number
): number => {
  switch (repetitions) {
    case 0:
      return 1; // First review: 1 day
    case 1:
      return 6; // Second review: 6 days
    default:
      // Subsequent reviews: previous interval * easiness factor
      return Math.round(
        calculateInterval(repetitions - 1, easinessFactor) * easinessFactor
      );
  }
};

/**
 * Calculate running average quality rating
 */
const calculateAverageQuality = (
  currentAverage: number,
  totalReviews: number,
  newQuality: QualityRating
): number => {
  if (totalReviews === 0) return newQuality;
  return (currentAverage * totalReviews + newQuality) / (totalReviews + 1);
};

/**
 * Main SM-2 algorithm implementation
 * Updates flashcard parameters based on user's quality rating
 */
export const calculateSM2 = (
  currentParams: SM2Parameters,
  quality: QualityRating,
  reviewDate: Date = new Date()
): SM2Result => {
  // Normalize review date to start of day for consistent scheduling
  const normalizedReviewDate = startOfDay(reviewDate);

  // Calculate new easiness factor
  const newEasinessFactor = calculateEasinessFactor(
    currentParams.easinessFactor,
    quality
  );

  // Update total reviews and average quality
  const newTotalReviews = currentParams.totalReviews + 1;
  const newAverageQuality = calculateAverageQuality(
    currentParams.averageQuality,
    currentParams.totalReviews,
    quality
  );

  // Determine if the answer was correct (quality >= 3)
  const isCorrect = quality >= 3;

  let newRepetitions: number;
  let newInterval: number;
  let newCorrectStreak: number;
  let shouldRepeatToday: boolean;

  if (isCorrect) {
    // Correct answer: increment repetitions and calculate new interval
    newRepetitions = currentParams.repetitions + 1;
    newInterval = calculateInterval(newRepetitions, newEasinessFactor);
    newCorrectStreak = currentParams.correctStreak + 1;
    shouldRepeatToday = false;
  } else {
    // Incorrect answer: reset repetitions, set interval to 1, mark for repeat
    newRepetitions = 0;
    newInterval = 1;
    newCorrectStreak = 0;
    shouldRepeatToday = true; // Card will be added back to today's queue
  }

  // Calculate next review date
  const nextReviewDate = addDays(normalizedReviewDate, newInterval);

  return {
    easinessFactor: newEasinessFactor,
    repetitions: newRepetitions,
    interval: newInterval,
    nextReviewDate,
    lastReviewDate: normalizedReviewDate,
    totalReviews: newTotalReviews,
    correctStreak: newCorrectStreak,
    averageQuality: newAverageQuality,
    shouldRepeatToday,
  };
};

/**
 * Check if a card is due for review
 */
export const isCardDue = (
  nextReviewDate: Date,
  currentDate: Date = new Date()
): boolean => {
  const normalizedCurrentDate = startOfDay(currentDate);
  const normalizedReviewDate = startOfDay(nextReviewDate);

  return !isAfter(normalizedReviewDate, normalizedCurrentDate);
};

/**
 * Get cards that are due for review from a list of cards
 */
export const getDueCards = <T extends { sm2: SM2Parameters }>(
  cards: T[],
  currentDate: Date = new Date()
): T[] => {
  return cards.filter((card) =>
    isCardDue(card.sm2.nextReviewDate, currentDate)
  );
};

/**
 * Sort cards by review priority (overdue cards first, then by next review date)
 */
export const sortCardsByPriority = <T extends { sm2: SM2Parameters }>(
  cards: T[],
  currentDate: Date = new Date()
): T[] => {
  const normalizedCurrentDate = startOfDay(currentDate);

  return [...cards].sort((a, b) => {
    const aReviewDate = startOfDay(a.sm2.nextReviewDate);
    const bReviewDate = startOfDay(b.sm2.nextReviewDate);

    // Calculate days overdue (negative = overdue, positive = future)
    const aDaysOverdue = differenceInDays(aReviewDate, normalizedCurrentDate);
    const bDaysOverdue = differenceInDays(bReviewDate, normalizedCurrentDate);

    // Sort by days overdue (most overdue first), then by easiness factor (harder cards first)
    if (aDaysOverdue !== bDaysOverdue) {
      return aDaysOverdue - bDaysOverdue;
    }

    // If same review date, prioritize cards with lower easiness factor (harder cards)
    return a.sm2.easinessFactor - b.sm2.easinessFactor;
  });
};

/**
 * Initialize SM-2 parameters for a new flashcard
 */
export const initializeSM2Params = (
  creationDate: Date = new Date()
): SM2Parameters => {
  const normalizedDate = startOfDay(creationDate);
  // For new cards, set lastReviewDate to a day before creation so they won't count as "reviewed today"
  const dayBeforeCreation = addDays(normalizedDate, -1);

  return {
    ...DEFAULT_SM2_PARAMS,
    nextReviewDate: normalizedDate, // New cards are due immediately
    lastReviewDate: dayBeforeCreation, // Set to day before creation, not creation date
  };
};

/**
 * Get statistics about a user's review performance
 */
export interface ReviewStats {
  totalCards: number;
  dueCards: number;
  overdueCards: number;
  masteredCards: number; // Cards with high repetitions and easiness factor
  difficultCards: number; // Cards with low easiness factor
  averageEasinessFactor: number;
  totalReviews: number;
  averageQuality: number;
}

export const calculateReviewStats = <T extends { sm2: SM2Parameters }>(
  cards: T[],
  currentDate: Date = new Date()
): ReviewStats => {
  if (cards.length === 0) {
    return {
      totalCards: 0,
      dueCards: 0,
      overdueCards: 0,
      masteredCards: 0,
      difficultCards: 0,
      averageEasinessFactor: 0,
      totalReviews: 0,
      averageQuality: 0,
    };
  }

  const normalizedCurrentDate = startOfDay(currentDate);

  let dueCards = 0;
  let overdueCards = 0;
  let masteredCards = 0;
  let difficultCards = 0;
  let totalEasinessFactor = 0;
  let totalReviews = 0;
  let totalQualitySum = 0;
  let totalQualityCount = 0;

  cards.forEach((card) => {
    const { sm2 } = card;

    // Count due and overdue cards
    if (isCardDue(sm2.nextReviewDate, currentDate)) {
      dueCards++;

      if (isAfter(normalizedCurrentDate, startOfDay(sm2.nextReviewDate))) {
        overdueCards++;
      }
    }

    // Count mastered cards (repetitions >= 3 and easiness factor >= 2.0)
    if (sm2.repetitions >= 3 && sm2.easinessFactor >= 2.0) {
      masteredCards++;
    }

    // Count difficult cards (easiness factor < 1.8)
    if (sm2.easinessFactor < 1.8) {
      difficultCards++;
    }

    // Accumulate stats
    totalEasinessFactor += sm2.easinessFactor;
    totalReviews += sm2.totalReviews;

    if (sm2.totalReviews > 0) {
      totalQualitySum += sm2.averageQuality * sm2.totalReviews;
      totalQualityCount += sm2.totalReviews;
    }
  });

  return {
    totalCards: cards.length,
    dueCards,
    overdueCards,
    masteredCards,
    difficultCards,
    averageEasinessFactor: totalEasinessFactor / cards.length,
    totalReviews,
    averageQuality:
      totalQualityCount > 0 ? totalQualitySum / totalQualityCount : 0,
  };
};

/**
 * Utility function to format review statistics for display
 */
export const formatReviewStats = (
  stats: ReviewStats
): Record<string, string> => {
  const percentage = (value: number, total: number) =>
    total > 0 ? `${Math.round((value / total) * 100)}%` : "0%";

  return {
    totalCards: stats.totalCards.toString(),
    dueCards: stats.dueCards.toString(),
    overdueCards: stats.overdueCards.toString(),
    masteredCards: `${stats.masteredCards} (${percentage(
      stats.masteredCards,
      stats.totalCards
    )})`,
    difficultCards: `${stats.difficultCards} (${percentage(
      stats.difficultCards,
      stats.totalCards
    )})`,
    averageEasinessFactor: stats.averageEasinessFactor.toFixed(2),
    totalReviews: stats.totalReviews.toString(),
    averageQuality: stats.averageQuality.toFixed(1),
  };
};

// Export the main SM-2 utilities
export default {
  calculateSM2,
  isCardDue,
  getDueCards,
  sortCardsByPriority,
  initializeSM2Params,
  calculateReviewStats,
  formatReviewStats,
  QUALITY_RATINGS,
  DEFAULT_SM2_PARAMS,
};
