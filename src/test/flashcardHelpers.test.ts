// Test file for flashcardHelpers utility functions
import { describe, it, expect } from "vitest";
import {
  isCardReviewedToday,
  calculateReviewsToday,
} from "../utils/flashcardHelpers";
import type { Flashcard } from "../types/flashcard";

describe("flashcardHelpers", () => {
  const today = new Date("2025-09-22T10:00:00Z");
  const yesterday = new Date("2025-09-21T10:00:00Z");

  const createMockCard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
    id: "test-card",
    front: { icon: "", title: "Test", description: "Test card" },
    back: { icon: "", title: "Answer", description: "Test answer" },
    cardSetId: "test-set",
    easinessFactor: 2.5,
    repetitions: 0,
    interval: 1,
    nextReviewDate: today,
    lastReviewDate: yesterday,
    totalReviews: 0,
    correctStreak: 0,
    averageQuality: 0,
    isNew: true,
    createdAt: today,
    updatedAt: today,
    ...overrides,
  });

  describe("isCardReviewedToday", () => {
    it("should return false for new cards that have never been reviewed", () => {
      const newCard = createMockCard({
        isNew: true,
        totalReviews: 0,
        lastReviewDate: today, // Even if lastReviewDate is today, if it's new, it shouldn't count
      });

      expect(isCardReviewedToday(newCard, today)).toBe(false);
    });

    it("should return false for cards reviewed yesterday", () => {
      const reviewedYesterday = createMockCard({
        isNew: false,
        totalReviews: 1,
        lastReviewDate: yesterday,
      });

      expect(isCardReviewedToday(reviewedYesterday, today)).toBe(false);
    });

    it("should return true for cards actually reviewed today", () => {
      const reviewedToday = createMockCard({
        isNew: false,
        totalReviews: 1,
        lastReviewDate: today,
      });

      expect(isCardReviewedToday(reviewedToday, today)).toBe(true);
    });

    it("should return false for cards with null lastReviewDate", () => {
      const cardWithNullDate = createMockCard({
        isNew: false,
        totalReviews: 1,
        lastReviewDate: null as any,
      });

      expect(isCardReviewedToday(cardWithNullDate, today)).toBe(false);
    });

    it("should return false for cards with invalid lastReviewDate", () => {
      const cardWithInvalidDate = createMockCard({
        isNew: false,
        totalReviews: 1,
        lastReviewDate: "invalid-date" as any,
      });

      expect(isCardReviewedToday(cardWithInvalidDate, today)).toBe(false);
    });

    it("should return false for cards with totalReviews = 0", () => {
      const cardNeverReviewed = createMockCard({
        isNew: false,
        totalReviews: 0,
        lastReviewDate: today,
      });

      expect(isCardReviewedToday(cardNeverReviewed, today)).toBe(false);
    });
  });

  describe("calculateReviewsToday", () => {
    it("should return 0 for empty card array", () => {
      expect(calculateReviewsToday([], today)).toBe(0);
    });

    it("should return 0 for all new cards", () => {
      const newCards = [
        createMockCard({
          id: "card1",
          isNew: true,
          totalReviews: 0,
          lastReviewDate: today,
        }),
        createMockCard({
          id: "card2",
          isNew: true,
          totalReviews: 0,
          lastReviewDate: today,
        }),
      ];

      expect(calculateReviewsToday(newCards, today)).toBe(0);
    });

    it("should count only actually reviewed cards for today", () => {
      const mixedCards = [
        // New card - should not count
        createMockCard({
          id: "new",
          isNew: true,
          totalReviews: 0,
          lastReviewDate: today,
        }),
        // Reviewed today - should count
        createMockCard({
          id: "today1",
          isNew: false,
          totalReviews: 1,
          lastReviewDate: today,
        }),
        // Reviewed yesterday - should not count
        createMockCard({
          id: "yesterday",
          isNew: false,
          totalReviews: 1,
          lastReviewDate: yesterday,
        }),
        // Another reviewed today - should count
        createMockCard({
          id: "today2",
          isNew: false,
          totalReviews: 2,
          lastReviewDate: today,
        }),
      ];

      expect(calculateReviewsToday(mixedCards, today)).toBe(2);
    });

    it("should handle cards with null lastReviewDate", () => {
      const cardsWithNullDates = [
        createMockCard({
          id: "null-date",
          isNew: false,
          totalReviews: 1,
          lastReviewDate: null as any,
        }),
        createMockCard({
          id: "today",
          isNew: false,
          totalReviews: 1,
          lastReviewDate: today,
        }),
      ];

      expect(calculateReviewsToday(cardsWithNullDates, today)).toBe(1);
    });
  });
});
