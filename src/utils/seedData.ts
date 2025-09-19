// Seed data utility for testing and development
// Provides default flashcards for test users

import type { Flashcard, FlashcardData } from "../types/flashcard";
import { initializeSM2Params } from "./sm2";
import flashcardsData from "../data/flashcards.json";

// Test user email for seeding
export const TEST_USER_EMAIL = "apriakb@gmail.com";

// Transform raw flashcard data to include SM-2 parameters
export const transformFlashcardData = (data: FlashcardData): Flashcard => {
  const sm2Params = initializeSM2Params();
  const now = new Date();

  return {
    ...data,
    ...sm2Params,
    createdAt: now,
    updatedAt: now,
    isNew: true,
  };
};

// Get default seed flashcards (transformed with SM-2 params)
export const getDefaultSeedCards = (): Flashcard[] => {
  return (flashcardsData as FlashcardData[]).map(transformFlashcardData);
};

// Create sample progress cards with various states for testing
export const createProgressSampleCards = (): Flashcard[] => {
  const baseCards = getDefaultSeedCards();
  const now = new Date();

  // Take first 10 cards and modify their progress states
  return baseCards.slice(0, 10).map((card, index) => {
    switch (index % 4) {
      case 0: // New card (default state)
        return card;

      case 1: // Easy card (mastered)
        return {
          ...card,
          easinessFactor: 2.8,
          repetitions: 3,
          interval: 8,
          nextReviewDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
          lastReviewDate: now,
          totalReviews: 5,
          correctStreak: 3,
          averageQuality: 4.2,
          isNew: false,
        };

      case 2: // Hard card (difficult)
        return {
          ...card,
          easinessFactor: 1.9,
          repetitions: 1,
          interval: 1,
          nextReviewDate: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Due yesterday
          lastReviewDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          totalReviews: 8,
          correctStreak: 0,
          averageQuality: 1.8,
          isNew: false,
        };

      case 3: // Regular progress card
        return {
          ...card,
          easinessFactor: 2.4,
          repetitions: 2,
          interval: 3,
          nextReviewDate: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Due 12 hours ago
          lastReviewDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          totalReviews: 3,
          correctStreak: 1,
          averageQuality: 3.0,
          isNew: false,
        };

      default:
        return card;
    }
  });
};

// Check if user needs seed data
export const shouldSeedUser = (userEmail: string): boolean => {
  // Always seed for test user, or if explicitly requested
  return userEmail === TEST_USER_EMAIL || userEmail.includes("test");
};

// Generate seed data based on user type
export const generateSeedData = (userEmail: string): Flashcard[] => {
  if (userEmail === TEST_USER_EMAIL) {
    // Test user gets sample progress cards for testing
    return createProgressSampleCards();
  } else {
    // Other users get default cards
    return getDefaultSeedCards();
  }
};

// Seed data configuration
export const SEED_CONFIG = {
  TEST_USER_EMAIL,
  DEFAULT_CARD_COUNT: flashcardsData.length,
  PROGRESS_SAMPLE_COUNT: 10,
  SEED_TIMESTAMP: new Date().toISOString(),
} as const;

export default {
  TEST_USER_EMAIL,
  getDefaultSeedCards,
  createProgressSampleCards,
  shouldSeedUser,
  generateSeedData,
  transformFlashcardData,
  SEED_CONFIG,
};
