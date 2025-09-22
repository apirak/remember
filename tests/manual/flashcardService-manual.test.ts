// Manual integration test for FlashcardService with real Firebase
// Run this with: pnpm test flashcardService-manual.test.ts --run
// Make sure you are signed in via the web app first

import { describe, it, expect } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";
import { getCurrentUser } from "../../src/utils/auth";

describe("FlashcardService - Manual Firebase Test", () => {
  it("should demonstrate card creation workflow", async () => {
    const TEST_CARD_SET_ID = "manual_test_business";
    const TEST_CARD_SET_FILE = "business_chinese.json";

    // Check authentication first
    const user = getCurrentUser();
    if (!user) {
      throw new Error(
        "❌ No user authenticated. Please sign in via http://localhost:4322/db-test first"
      );
    }

    console.log(`✅ User authenticated: ${user.email}`);
    console.log(`📱 Testing card set: ${TEST_CARD_SET_ID}`);

    try {
      // Step 1: Load card set data
      const result = await FlashcardService.loadCardSetData(
        TEST_CARD_SET_ID,
        TEST_CARD_SET_FILE
      );

      // Show detailed results
      const summary = {
        success: result.success,
        source: result.data?.source,
        cardCount: result.data?.cards?.length,
        error: result.error,
      };

      console.log("📊 Result Summary:", JSON.stringify(summary, null, 2));

      if (result.success && result.data?.cards) {
        const firstCard = result.data.cards[0];
        console.log("🃏 First Card Sample:", {
          id: firstCard.id,
          cardSetId: firstCard.cardSetId,
          frontTitle: firstCard.front.title,
          backTitle: firstCard.back.title,
          easinessFactor: firstCard.easinessFactor,
        });

        // Firebase Console link
        console.log("\n🔍 Check Firebase Console:");
        console.log(
          `https://console.firebase.google.com/project/your-project/firestore/data/~2Fusers~2F${user.uid}~2FcardSets~2F${TEST_CARD_SET_ID}~2Fcards`
        );
      }

      expect(result.success).toBe(true);
      expect(result.data?.cards).toBeDefined();
      expect(result.data?.cards.length).toBeGreaterThan(0);
    } catch (error) {
      console.error("❌ Test failed:", error);
      throw error;
    }
  }, 30000);
});
