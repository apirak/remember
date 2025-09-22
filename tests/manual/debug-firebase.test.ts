// Simple test to verify Firebase connection and card creation logic
// This test will use console.log to show what happens

import { describe, it } from "vitest";
import { FlashcardService } from "../../src/services/flashcardService";

describe("FlashcardService - Debug Firebase", () => {
  it("should show what happens when calling loadCardSetData", async () => {
    const TEST_CARD_SET_ID = "debug_test_set";
    const TEST_CARD_SET_FILE = "business_chinese.json";

    console.log("\n🔧 DEBUG: Firebase Card Creation Test");
    console.log("==========================================");

    try {
      console.log(`📱 Testing card set: ${TEST_CARD_SET_ID}`);
      console.log(`📄 JSON file: ${TEST_CARD_SET_FILE}`);

      const result = await FlashcardService.loadCardSetData(
        TEST_CARD_SET_ID,
        TEST_CARD_SET_FILE
      );

      console.log("\n📊 RESULT:");
      console.log("Success:", result.success);
      console.log("Error:", result.error);
      console.log("Data source:", result.data?.source);
      console.log("Card count:", result.data?.cards?.length);

      if (result.success && result.data?.cards?.[0]) {
        console.log("\n🃏 SAMPLE CARD:");
        const card = result.data.cards[0];
        console.log("- ID:", card.id);
        console.log("- Card Set ID:", card.cardSetId);
        console.log("- Front Title:", card.front.title);
        console.log("- Back Title:", card.back.title);
        console.log("- Easiness Factor:", card.easinessFactor);
      }

      console.log("\n🔍 FIREBASE DEBUGGING:");
      console.log("If you see an error above, here's what to check:");
      console.log(
        "1. Are you signed in? → Go to http://localhost:4322/db-test"
      );
      console.log("2. Is Firebase configured? → Check src/utils/firebase.ts");
      console.log("3. Are Firestore rules correct? → Check Firebase Console");
    } catch (error) {
      console.log("\n❌ ERROR CAUGHT:");
      if (error instanceof Error) {
        console.log("Type:", error.constructor.name);
        console.log("Message:", error.message);
        console.log("Stack:", error.stack);
      } else {
        console.log("Unknown error:", error);
      }
    }

    console.log("\n==========================================");
  }, 30000);
});
