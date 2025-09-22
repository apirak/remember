// Test for lazy card creation on review
// Tests the flow: user reviews card → card gets created in Firestore with progress

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";
import * as firestoreUtils from "../../src/utils/firestore";
import * as authUtils from "../../src/utils/auth";

// Mock Firebase Auth
vi.mock("../../src/utils/auth", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Firestore utilities
vi.mock("../../src/utils/firestore", () => ({
  updateFlashcardProgress: vi.fn(),
}));

describe("FlashcardService - Lazy Card Creation", () => {
  const mockUser = {
    uid: "test-user-123",
    email: "test@example.com",
  };

  const mockCardData = {
    id: "lazy-001",
    front: {
      icon: "💼",
      title: "商务",
      description: "Business",
    },
    back: {
      icon: "📊",
      title: "shāngwù",
      description: "Commercial activities",
    },
  };

  const mockProgressData = {
    easinessFactor: 2.6,
    repetitions: 1,
    interval: 1,
    nextReviewDate: new Date(),
    lastReviewDate: new Date(),
    totalReviews: 1,
    correctStreak: 1,
    averageQuality: 4.0,
    isNew: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create card with progress when user reviews for first time", async () => {
    // Mock successful lazy creation
    (firestoreUtils.updateFlashcardProgress as any).mockResolvedValue({
      success: true,
      data: {
        ...mockCardData,
        ...mockProgressData,
        cardSetId: "business_chinese",
      },
    });

    const result = await FlashcardService.saveCardWithProgress(
      mockCardData,
      "business_chinese",
      mockProgressData
    );

    expect(result.success).toBe(true);

    // Verify updateFlashcardProgress was called with correct data
    expect(firestoreUtils.updateFlashcardProgress).toHaveBeenCalledWith(
      "lazy-001",
      "business_chinese",
      expect.objectContaining({
        id: "lazy-001",
        cardSetId: "business_chinese",
        front: mockCardData.front,
        back: mockCardData.back,
        easinessFactor: 2.6,
        totalReviews: 1,
        isNew: false,
      })
    );
  });

  it("should save progress for existing card", async () => {
    // Mock successful progress update
    (firestoreUtils.updateFlashcardProgress as any).mockResolvedValue({
      success: true,
      data: mockProgressData,
    });

    const result = await FlashcardService.saveProgress(
      "existing-001",
      "business_chinese",
      mockProgressData
    );

    expect(result.success).toBe(true);

    // Verify updateFlashcardProgress was called
    expect(firestoreUtils.updateFlashcardProgress).toHaveBeenCalledWith(
      "existing-001",
      "business_chinese",
      mockProgressData
    );
  });

  it("should handle errors in lazy creation", async () => {
    // Mock Firestore error
    (firestoreUtils.updateFlashcardProgress as any).mockResolvedValue({
      success: false,
      error: "Firestore connection failed",
    });

    const result = await FlashcardService.saveCardWithProgress(
      mockCardData,
      "business_chinese",
      mockProgressData
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Firestore connection failed");
  });

  it("should require authentication for lazy creation", async () => {
    // Mock no user
    (authUtils.getCurrentUser as any).mockReturnValue(null);

    const result = await FlashcardService.saveCardWithProgress(
      mockCardData,
      "business_chinese",
      mockProgressData
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be authenticated");
    expect(firestoreUtils.updateFlashcardProgress).not.toHaveBeenCalled();
  });

  it("should include cardSetId in saved data", async () => {
    (firestoreUtils.updateFlashcardProgress as any).mockResolvedValue({
      success: true,
      data: {},
    });

    await FlashcardService.saveCardWithProgress(
      mockCardData,
      "test_card_set",
      mockProgressData
    );

    // Verify cardSetId is included in the call
    expect(firestoreUtils.updateFlashcardProgress).toHaveBeenCalledWith(
      "lazy-001",
      "test_card_set",
      expect.objectContaining({
        cardSetId: "test_card_set",
      })
    );
  });
});
