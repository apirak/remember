// Simple test for FlashcardService card set logic
// Tests the straightforward logic: Firestore → JSON + Save → Firestore again

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
  getUserFlashcards: vi.fn(),
  saveFlashcardsBatch: vi.fn(),
}));

// Mock business chinese data
vi.mock("../../src/data/business_chinese.json", () => ({
  default: [
    {
      id: "biz-001",
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
    },
  ],
}));

describe("FlashcardService - Simple Card Set Logic", () => {
  const mockUser = {
    uid: "test-user-123",
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (authUtils.getCurrentUser as any).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return cards from Firestore when they exist", async () => {
    // Mock: Firestore has data
    const mockFirestoreCards = [
      {
        id: "biz-001",
        front: { icon: "💼", title: "商务", description: "Business" },
        back: {
          icon: "📊",
          title: "shāngwù",
          description: "Commercial activities",
        },
        cardSetId: "business_chinese",
        easinessFactor: 2.5,
        nextReviewDate: new Date(),
      },
    ];

    (firestoreUtils.getUserFlashcards as any).mockResolvedValue({
      success: true,
      data: mockFirestoreCards,
    });

    const result = await FlashcardService.loadCardSetData(
      "business_chinese",
      "business_chinese.json"
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe("firestore");
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].id).toBe("biz-001");

    // Should only call getUserFlashcards once (first check)
    expect(firestoreUtils.getUserFlashcards).toHaveBeenCalledTimes(1);
    expect(firestoreUtils.getUserFlashcards).toHaveBeenCalledWith(
      "business_chinese"
    );

    // Should NOT call saveFlashcardsBatch since data exists
    expect(firestoreUtils.saveFlashcardsBatch).not.toHaveBeenCalled();
  });

  it("should create from JSON and save when Firestore is empty", async () => {
    // Mock: Firestore is empty first, then has data after save
    (firestoreUtils.getUserFlashcards as any)
      .mockResolvedValueOnce({
        // First call - empty
        success: true,
        data: [],
      })
      .mockResolvedValueOnce({
        // Second call - after save
        success: true,
        data: [
          {
            id: "biz-001",
            front: { icon: "💼", title: "商务", description: "Business" },
            cardSetId: "business_chinese",
            easinessFactor: 2.6,
            nextReviewDate: new Date(),
          },
        ],
      });

    // Mock: Save succeeds
    (firestoreUtils.saveFlashcardsBatch as any).mockResolvedValue({
      success: true,
    });

    const result = await FlashcardService.loadCardSetData(
      "business_chinese",
      "business_chinese.json"
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe("firestore");
    expect(result.data?.cards).toHaveLength(1);

    // Should call getUserFlashcards twice (before and after save)
    expect(firestoreUtils.getUserFlashcards).toHaveBeenCalledTimes(2);

    // Should call saveFlashcardsBatch once
    expect(firestoreUtils.saveFlashcardsBatch).toHaveBeenCalledTimes(1);
    expect(firestoreUtils.saveFlashcardsBatch).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "biz-001",
          cardSetId: "business_chinese",
        }),
      ]),
      "business_chinese"
    );
  });

  it("should fallback to JSON when save fails", async () => {
    // Mock: Firestore is empty
    (firestoreUtils.getUserFlashcards as any).mockResolvedValue({
      success: true,
      data: [],
    });

    // Mock: Save fails
    (firestoreUtils.saveFlashcardsBatch as any).mockResolvedValue({
      success: false,
      error: "Save failed",
    });

    const result = await FlashcardService.loadCardSetData(
      "business_chinese",
      "business_chinese.json"
    );

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe("json");
    expect(result.data?.cards).toHaveLength(1);
    expect(result.data?.cards[0].id).toBe("biz-001");

    // Should try to save but fall back to JSON
    expect(firestoreUtils.saveFlashcardsBatch).toHaveBeenCalledTimes(1);
  });

  it("should fail gracefully for invalid JSON files", async () => {
    // Mock: Firestore is empty
    (firestoreUtils.getUserFlashcards as any).mockResolvedValue({
      success: true,
      data: [],
    });

    const result = await FlashcardService.loadCardSetData(
      "invalid_set",
      "nonexistent.json"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to load JSON data");
  });
});
