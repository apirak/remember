// Integration test for FlashcardService with REAL Firebase
// This test connects to actual Firebase and verifies data creation
// Make sure Firebase Auth is set up and user is logged in

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";
import { getCurrentUser } from "../../src/utils/auth";
import { getUserFlashcards } from "../../src/utils/firestore";
import { firestore } from "../../src/utils/firebase";
import { doc, deleteDoc } from "firebase/firestore";

// Test configuration
const TEST_CARD_SET_ID = "test_integration_set";
const TEST_CARD_SET_FILE = "business_chinese.json";

// Helper to clean up test data
async function cleanupTestData() {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    console.log(`Cleaning up test data for card set: ${TEST_CARD_SET_ID}`);

    // Get all cards in test card set
    const cardsResult = await getUserFlashcards(TEST_CARD_SET_ID);

    if (cardsResult.success && cardsResult.data) {
      // Delete each card
      for (const card of cardsResult.data) {
        const cardRef = doc(
          firestore,
          "users",
          currentUser.uid,
          "cardSets",
          TEST_CARD_SET_ID,
          "cards",
          card.id
        );
        await deleteDoc(cardRef);
      }
      console.log(`Deleted ${cardsResult.data.length} test cards`);
    }
  } catch (error) {
    console.warn("Error during cleanup:", error);
  }
}

// Skip integration tests - requires real Firebase authentication
// To run manually: sign in at http://localhost:4322/db-test then run this test
describe.skip("FlashcardService - Real Firebase Integration", () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    // Verify user is authenticated
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error(
        "User must be authenticated for integration tests. Please sign in first."
      );
    }

    console.log(`Running integration tests for user: ${currentUser.email}`);
  });

  afterAll(async () => {
    // Clean up test data after tests
    await cleanupTestData();
  });

  it("should create cards in Firebase when card set is empty", async () => {
    console.log("\n=== Testing card creation in Firebase ===");

    // Step 1: Verify Firestore is empty for test card set
    console.log("Step 1: Checking if Firestore is empty...");
    const initialResult = await FlashcardService.loadUserFlashcards(
      TEST_CARD_SET_ID
    );

    expect(initialResult.success).toBe(true);
    expect(initialResult.data).toEqual([]);
    console.log("✅ Confirmed: Firestore is empty for test card set");

    // Step 2: Call loadCardSetData - should create cards from JSON
    console.log("Step 2: Loading card set data (should create from JSON)...");
    const loadResult = await FlashcardService.loadCardSetData(
      TEST_CARD_SET_ID,
      TEST_CARD_SET_FILE
    );

    expect(loadResult.success).toBe(true);
    expect(loadResult.data?.source).toBe("firestore");
    expect(loadResult.data?.cards).toBeDefined();
    expect(loadResult.data?.cards.length).toBeGreaterThan(0);

    const createdCards = loadResult.data!.cards;
    console.log(
      `✅ Success: Created ${createdCards.length} cards, source: ${loadResult.data?.source}`
    );

    // Step 3: Verify cards actually exist in Firebase by loading again
    console.log("Step 3: Verifying cards exist in Firebase...");
    const verifyResult = await FlashcardService.loadUserFlashcards(
      TEST_CARD_SET_ID
    );

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.data).toBeDefined();
    expect(verifyResult.data!.length).toBe(createdCards.length);

    console.log(
      `✅ Verified: ${verifyResult.data!.length} cards found in Firebase`
    );

    // Step 4: Verify card structure is correct
    const firstCard = verifyResult.data![0];
    expect(firstCard).toMatchObject({
      id: expect.any(String),
      cardSetId: TEST_CARD_SET_ID,
      front: expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
      }),
      back: expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
      }),
      easinessFactor: expect.any(Number),
      nextReviewDate: expect.any(Date),
      lastReviewDate: expect.any(Date),
    });

    console.log("✅ Verified: Card structure is correct");
    console.log("First card:", {
      id: firstCard.id,
      cardSetId: firstCard.cardSetId,
      frontTitle: firstCard.front.title,
      easinessFactor: firstCard.easinessFactor,
    });

    // Step 5: Test subsequent load uses Firestore (not JSON)
    console.log("Step 5: Testing subsequent load uses Firestore...");
    const secondLoadResult = await FlashcardService.loadCardSetData(
      TEST_CARD_SET_ID,
      TEST_CARD_SET_FILE
    );

    expect(secondLoadResult.success).toBe(true);
    expect(secondLoadResult.data?.source).toBe("firestore");
    expect(secondLoadResult.data?.cards.length).toBe(createdCards.length);

    console.log(
      `✅ Verified: Second load used Firestore, found ${secondLoadResult.data?.cards.length} cards`
    );

    console.log("\n🎉 Integration test completed successfully!");
  }, 30000); // 30 second timeout for Firebase operations

  it("should handle card set isolation correctly", async () => {
    console.log("\n=== Testing card set isolation ===");

    const CARD_SET_A = "test_set_a";
    const CARD_SET_B = "test_set_b";

    try {
      // Load different card sets
      const resultA = await FlashcardService.loadCardSetData(
        CARD_SET_A,
        TEST_CARD_SET_FILE
      );

      const resultB = await FlashcardService.loadCardSetData(
        CARD_SET_B,
        TEST_CARD_SET_FILE
      );

      expect(resultA.success).toBe(true);
      expect(resultB.success).toBe(true);

      // Verify cards have correct cardSetId
      if (resultA.data?.cards) {
        resultA.data.cards.forEach((card) => {
          expect(card.cardSetId).toBe(CARD_SET_A);
        });
      }

      if (resultB.data?.cards) {
        resultB.data.cards.forEach((card) => {
          expect(card.cardSetId).toBe(CARD_SET_B);
        });
      }

      console.log(`✅ Card set isolation verified`);
    } finally {
      // Cleanup isolation test data
      const currentUser = getCurrentUser();
      if (currentUser) {
        for (const cardSetId of [CARD_SET_A, CARD_SET_B]) {
          try {
            const cards = await getUserFlashcards(cardSetId);
            if (cards.success && cards.data) {
              for (const card of cards.data) {
                const cardRef = doc(
                  firestore,
                  "users",
                  currentUser.uid,
                  "cardSets",
                  cardSetId,
                  "cards",
                  card.id
                );
                await deleteDoc(cardRef);
              }
            }
          } catch (error) {
            console.warn(`Error cleaning up ${cardSetId}:`, error);
          }
        }
      }
    }
  }, 30000);
});
