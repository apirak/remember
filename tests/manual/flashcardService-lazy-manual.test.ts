// Manual test for lazy card creation with real Firebase
// Test the complete flow: review card → lazy creation in Firestore

import { describe, it, expect } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";

describe("Lazy Card Creation - Manual Firebase Test", () => {
  const TEST_CARD_SET_ID = "lazy_test_set";

  const sampleCard = {
    id: "lazy-test-001",
    front: {
      icon: "🧪",
      title: "测试",
      description: "Test card for lazy creation",
    },
    back: {
      icon: "✅",
      title: "cèshì",
      description: "This card was created lazily when first reviewed",
    },
  };

  const progressAfterReview = {
    easinessFactor: 2.7,
    repetitions: 1,
    interval: 1,
    nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    lastReviewDate: new Date(),
    totalReviews: 1,
    correctStreak: 1,
    averageQuality: 4.0,
    isNew: false,
  };

  // Skip manual test - requires real Firebase authentication
  // To run manually: sign in at http://localhost:4322/db-test then run this test
  it.skip("should demonstrate lazy card creation workflow", async () => {
    console.log("\n🧪 Testing Lazy Card Creation Workflow");
    console.log("Make sure you are signed in via the web app first!");

    try {
      // Step 1: Verify card doesn't exist yet
      console.log("\nStep 1: Checking if card exists in Firestore...");
      const existingCards = await FlashcardService.loadUserFlashcards(
        TEST_CARD_SET_ID
      );

      if (existingCards.success && existingCards.data) {
        const existingCard = existingCards.data.find(
          (card) => card.id === sampleCard.id
        );
        if (existingCard) {
          console.log("⚠️  Card already exists, this test will update it");
        } else {
          console.log(
            "✅ Card doesn't exist yet - perfect for lazy creation test"
          );
        }
      }

      // Step 2: Simulate user reviewing card (lazy creation)
      console.log(
        "\nStep 2: Simulating user review (this should create the card)..."
      );
      const creationResult = await FlashcardService.saveCardWithProgress(
        sampleCard,
        TEST_CARD_SET_ID,
        progressAfterReview
      );

      console.log("Creation result:", {
        success: creationResult.success,
        error: creationResult.error,
      });

      expect(creationResult.success).toBe(true);

      // Step 3: Verify card was created in Firestore
      console.log("\nStep 3: Verifying card was created in Firestore...");
      const verifyResult = await FlashcardService.loadUserFlashcards(
        TEST_CARD_SET_ID
      );

      if (verifyResult.success && verifyResult.data) {
        const createdCard = verifyResult.data.find(
          (card) => card.id === sampleCard.id
        );

        if (createdCard) {
          console.log("🎉 SUCCESS! Card was created lazily:");
          console.log({
            id: createdCard.id,
            cardSetId: createdCard.cardSetId,
            frontTitle: createdCard.front.title,
            backTitle: createdCard.back.title,
            easinessFactor: createdCard.easinessFactor,
            totalReviews: createdCard.totalReviews,
            nextReviewDate: createdCard.nextReviewDate,
          });

          expect(createdCard.cardSetId).toBe(TEST_CARD_SET_ID);
          expect(createdCard.totalReviews).toBe(1);
          expect(createdCard.easinessFactor).toBe(2.7);
        } else {
          console.error("❌ Card was not found after creation");
          expect(createdCard).toBeDefined();
        }
      }

      // Step 4: Test updating existing card progress
      console.log("\nStep 4: Testing progress update on existing card...");
      const updateProgress = {
        ...progressAfterReview,
        easinessFactor: 2.8,
        repetitions: 2,
        totalReviews: 2,
        correctStreak: 2,
        averageQuality: 4.5,
      };

      const updateResult = await FlashcardService.saveProgress(
        sampleCard.id,
        TEST_CARD_SET_ID,
        updateProgress
      );

      expect(updateResult.success).toBe(true);
      console.log("✅ Progress update successful");

      console.log("\n🎯 Lazy Card Creation Test Completed Successfully!");
      console.log("Check Firebase Console:");
      console.log(
        `users/[your-id]/cardSets/${TEST_CARD_SET_ID}/cards/${sampleCard.id}`
      );
    } catch (error) {
      console.error("❌ Test failed:", error);
      throw error;
    }
  }, 30000);

  // Skip manual test - requires real Firebase authentication
  // To run manually: sign in at http://localhost:4322/db-test then run this test
  it.skip("should handle multiple cards in same card set", async () => {
    console.log("\n🔀 Testing Multiple Cards in Same Card Set");

    const card2 = {
      id: "lazy-test-002",
      front: {
        icon: "🎯",
        title: "目标",
        description: "Goal or target",
      },
      back: {
        icon: "🏹",
        title: "mùbiāo",
        description: "Something to aim for",
      },
    };

    try {
      // Create second card in same card set
      const result = await FlashcardService.saveCardWithProgress(
        card2,
        TEST_CARD_SET_ID,
        {
          ...progressAfterReview,
          easinessFactor: 2.5,
          averageQuality: 3.5,
        }
      );

      expect(result.success).toBe(true);

      // Verify both cards exist
      const allCards = await FlashcardService.loadUserFlashcards(
        TEST_CARD_SET_ID
      );

      if (allCards.success && allCards.data) {
        console.log(`✅ Found ${allCards.data.length} cards in card set`);

        const cardIds = allCards.data.map((card) => card.id);
        expect(cardIds).toContain("lazy-test-001");
        expect(cardIds).toContain("lazy-test-002");

        // Verify all cards have correct cardSetId
        allCards.data.forEach((card) => {
          expect(card.cardSetId).toBe(TEST_CARD_SET_ID);
        });
      }

      console.log("✅ Multiple cards test passed");
    } catch (error) {
      console.error("❌ Multiple cards test failed:", error);
      throw error;
    }
  }, 30000);
});
