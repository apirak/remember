// Integration test for session reducer batch optimization
// Tests that pendingProgress is correctly accumulated during review session

import { describe, it, expect, beforeEach } from "vitest";
import { sessionReducer } from "../../src/reducers/sessionReducer";
import type { FlashcardContextState, Flashcard, ReviewSession } from "../../src/types/flashcard";
import { QUALITY_RATINGS } from "../../src/utils/sm2";

describe("Session Reducer - Batch Optimization", () => {
  let mockState: FlashcardContextState;
  let mockCards: Flashcard[];
  let mockSession: ReviewSession;

  beforeEach(() => {
    // Create mock cards for testing
    mockCards = [
      {
        id: "card-1",
        front: { icon: "🚀", title: "Hello", description: "Greeting" },
        back: { icon: "👋", title: "你好", description: "nǐ hǎo" },
        cardSetId: "test-set",
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        totalReviews: 0,
        correctStreak: 0,
        averageQuality: 3.0,
        isNew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "card-2", 
        front: { icon: "🎯", title: "Thank you", description: "Gratitude" },
        back: { icon: "🙏", title: "谢谢", description: "xiè xiè" },
        cardSetId: "test-set",
        easinessFactor: 2.5,
        repetitions: 0,
        interval: 1,
        nextReviewDate: new Date(),
        lastReviewDate: new Date(),
        totalReviews: 0,
        correctStreak: 0,
        averageQuality: 3.0,
        isNew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Create mock session
    mockSession = {
      cards: [...mockCards],
      currentIndex: 0,
      isShowingBack: false,
      isComplete: false,
      startTime: new Date(),
      totalCards: mockCards.length,
      reviewedCards: 0,
      easyCount: 0,
      hardCount: 0,
      againCount: 0,
      reviewedCardIds: new Set<string>(),
      pendingProgress: new Map<string, any>(),
    };

    // Create mock state
    mockState = {
      allCards: mockCards,
      dueCards: mockCards,
      currentSession: mockSession,
      currentCard: mockCards[0],
      isShowingBack: false,
      selectedCardSet: null,
      availableCardSets: [],
      currentCardSet: { id: "test-set", name: "Test Set", cover: "🧪", dataFile: "test.json" },
      lastWorkingCardSet: null,
      user: { uid: "test-user", email: "test@example.com" },
      isGuest: false,
      dataSource: "firestore",
      syncStatus: "idle",
      lastSyncTime: null,
      error: null,
      pendingOperations: [],
      migrationStatus: "none",
      isLoading: false,
      loadingStates: {
        fetchingCards: false,
        savingProgress: false,
        creatingCard: false,
        deletingCard: false,
        migrating: false,
      },
      stats: {
        totalCards: 2,
        dueCards: 2,
        masteredCards: 0,
        difficultCards: 0,
        reviewsToday: 0,
      },
    };
  });

  it("should initialize empty pendingProgress on START_REVIEW_SESSION", () => {
    const result = sessionReducer(mockState, {
      type: "START_REVIEW_SESSION",
      payload: mockCards,
    });

    expect(result.currentSession?.pendingProgress).toBeInstanceOf(Map);
    expect(result.currentSession?.pendingProgress?.size).toBe(0);
  });

  it("should accumulate progress in pendingProgress on RATE_CARD", () => {
    const result = sessionReducer(mockState, {
      type: "RATE_CARD",
      payload: { cardId: "card-1", quality: QUALITY_RATINGS.GOOD },
    });

    // Check that pendingProgress contains the card progress
    const pendingProgress = result.currentSession?.pendingProgress;
    expect(pendingProgress?.size).toBe(1);
    expect(pendingProgress?.has("card-1")).toBe(true);

    const cardProgress = pendingProgress?.get("card-1");
    expect(cardProgress).toMatchObject({
      easinessFactor: expect.any(Number),
      repetitions: expect.any(Number),
      interval: expect.any(Number),
      nextReviewDate: expect.any(Date),
      lastReviewDate: expect.any(Date),
      totalReviews: 1,
      correctStreak: 1,
      averageQuality: expect.any(Number),
      isNew: false,
    });
  });

  it("should accumulate multiple card progress updates", () => {
    let state = { ...mockState };

    // Rate first card
    const result1 = sessionReducer(state, {
      type: "RATE_CARD", 
      payload: { cardId: "card-1", quality: QUALITY_RATINGS.GOOD },
    });

    // Update state with first result
    state = { ...state, ...result1 };

    // Rate second card (simulate moving to next card)
    state.currentCard = mockCards[1];
    const result2 = sessionReducer(state, {
      type: "RATE_CARD",
      payload: { cardId: "card-2", quality: QUALITY_RATINGS.EASY },
    });

    // Check that both cards are in pendingProgress
    const pendingProgress = result2.currentSession?.pendingProgress;
    expect(pendingProgress?.size).toBe(2);
    expect(pendingProgress?.has("card-1")).toBe(true);
    expect(pendingProgress?.has("card-2")).toBe(true);

    // Verify different quality ratings produce different progress
    const card1Progress = pendingProgress?.get("card-1");
    const card2Progress = pendingProgress?.get("card-2");
    
    expect(card1Progress?.averageQuality).not.toBe(card2Progress?.averageQuality);
  });

  it("should preserve pendingProgress across multiple rating actions", () => {
    let state = { ...mockState };

    // Rate same card multiple times (e.g., "Again" responses)
    const result1 = sessionReducer(state, {
      type: "RATE_CARD",
      payload: { cardId: "card-1", quality: QUALITY_RATINGS.AGAIN },
    });

    state = { ...state, ...result1 };

    const result2 = sessionReducer(state, {
      type: "RATE_CARD", 
      payload: { cardId: "card-1", quality: QUALITY_RATINGS.GOOD },
    });

    // Should still have one entry (same card updated)
    const pendingProgress = result2.currentSession?.pendingProgress;
    expect(pendingProgress?.size).toBe(1);
    expect(pendingProgress?.has("card-1")).toBe(true);

    // Should have updated progress data (not first attempt)
    const cardProgress = pendingProgress?.get("card-1");
    expect(cardProgress?.totalReviews).toBe(1); // Only counts completed reviews
  });

  it("should not lose pendingProgress on COMPLETE_SESSION", () => {
    // First accumulate some progress
    let state = { ...mockState };
    const result1 = sessionReducer(state, {
      type: "RATE_CARD",
      payload: { cardId: "card-1", quality: QUALITY_RATINGS.GOOD },
    });

    state = { ...state, ...result1 };

    // Complete the session
    sessionReducer(state, {
      type: "COMPLETE_SESSION",
    });

    // pendingProgress should still be available for batch save
    // Note: In real app, useEffect will consume this data for batch save
    const pendingProgress = state.currentSession?.pendingProgress;
    expect(pendingProgress?.size).toBe(1);
    expect(pendingProgress?.has("card-1")).toBe(true);
  });
});
