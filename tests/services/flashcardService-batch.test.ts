// Test for FlashcardService batch save optimization
// Tests the new saveProgressBatch method and session completion workflow

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";
import * as authUtils from "../../src/utils/auth";
import * as firestoreUtils from "../../src/utils/firestore";

// Mock Firebase Auth
vi.mock("../../src/utils/auth", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Firestore utilities
vi.mock("../../src/utils/firestore", () => ({
  saveFlashcardsBatch: vi.fn(),
}));

describe("FlashcardService - Batch Save Optimization", () => {
  const mockUser = {
    uid: "test-user-123",
    email: "test@example.com",
  };

  const mockProgressUpdates = new Map([
    ["card-1", {
      easinessFactor: 2.6,
      repetitions: 1,
      interval: 1,
      nextReviewDate: new Date(),
      lastReviewDate: new Date(),
      totalReviews: 1,
      correctStreak: 1,
      averageQuality: 4.0,
      isNew: false,
    }],
    ["card-2", {
      easinessFactor: 2.5,
      repetitions: 1,
      interval: 1,
      nextReviewDate: new Date(),
      lastReviewDate: new Date(),
      totalReviews: 1,
      correctStreak: 1,
      averageQuality: 3.0,
      isNew: false,
    }],
  ]);

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should batch save progress updates successfully", async () => {
    // Mock successful batch save
    (firestoreUtils.saveFlashcardsBatch as any).mockResolvedValue({
      success: true,
      data: [],
    });

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      "test_card_set"
    );

    expect(result.success).toBe(true);
    
    // Verify saveFlashcardsBatch was called with correct data
    expect(firestoreUtils.saveFlashcardsBatch).toHaveBeenCalledWith(
      [
        {
          id: "card-1",
          easinessFactor: 2.6,
          repetitions: 1,
          interval: 1,
          nextReviewDate: expect.any(Date),
          lastReviewDate: expect.any(Date),
          totalReviews: 1,
          correctStreak: 1,
          averageQuality: 4.0,
          isNew: false,
          cardSetId: "test_card_set",
        },
        {
          id: "card-2",
          easinessFactor: 2.5,
          repetitions: 1,
          interval: 1,
          nextReviewDate: expect.any(Date),
          lastReviewDate: expect.any(Date),
          totalReviews: 1,
          correctStreak: 1,
          averageQuality: 3.0,
          isNew: false,
          cardSetId: "test_card_set",
        },
      ],
      "test_card_set"
    );
  });

  it("should handle empty progress updates gracefully", async () => {
    const emptyMap = new Map();
    
    const result = await FlashcardService.saveProgressBatch(
      emptyMap,
      "test_card_set"
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
    
    // Should not call Firestore for empty updates
    expect(firestoreUtils.saveFlashcardsBatch).not.toHaveBeenCalled();
  });

  it("should fail when user is not authenticated", async () => {
    (authUtils.getCurrentUser as any).mockReturnValue(null);

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      "test_card_set"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("authenticated");
    expect(firestoreUtils.saveFlashcardsBatch).not.toHaveBeenCalled();
  });

  it("should handle Firestore errors gracefully", async () => {
    (firestoreUtils.saveFlashcardsBatch as any).mockResolvedValue({
      success: false,
      error: "Network error",
    });

    const result = await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      "test_card_set"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Network error");
  });

  it("should include cardSetId in each progress update", async () => {
    (firestoreUtils.saveFlashcardsBatch as any).mockResolvedValue({
      success: true,
      data: [],
    });

    await FlashcardService.saveProgressBatch(
      mockProgressUpdates,
      "business_chinese"
    );

    const callArgs = (firestoreUtils.saveFlashcardsBatch as any).mock.calls[0][0];
    
    expect(callArgs).toHaveLength(2);
    expect(callArgs[0]).toHaveProperty('cardSetId', 'business_chinese');
    expect(callArgs[1]).toHaveProperty('cardSetId', 'business_chinese');
  });
});
