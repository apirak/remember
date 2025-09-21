// Manual Test Plan for Card Set Persistence
// Run these steps to validate the persistence implementation

/**
 * MANUAL TEST PLAN: Card Set Persistence
 * =====================================
 *
 * SETUP:
 * 1. Open http://localhost:4322
 * 2. Open browser DevTools (F12) → Console tab
 * 3. Clear localStorage: localStorage.clear()
 *
 * TEST 1: Default Loading (No Saved Data)
 * ----------------------------------------
 * Expected: App loads with "Chinese Essentials 1" as default
 * Verification: Check dashboard shows 🇨🇳 emoji and "Chinese Essentials 1" title
 *
 * TEST 2: Save Card Set Selection
 * --------------------------------
 * Steps:
 * 1. Click "📚 All Sets" to go to card set selection
 * 2. Select "Chinese Essentials 2" (🏮)
 * 3. Check console logs for: "CardSetPersistence: Saved card set to localStorage Chinese Essentials 2"
 * 4. Verify localStorage has data: JSON.parse(localStorage.getItem('remember_last_card_set'))
 *
 * TEST 3: Persistence on Page Reload
 * -----------------------------------
 * Steps:
 * 1. After selecting Chinese Essentials 2, refresh the page (Ctrl+R / Cmd+R)
 * 2. Check console for: "CardSetPersistence: Loaded card set from localStorage Chinese Essentials 2"
 * 3. Verify dashboard shows 🏮 emoji and "Chinese Essentials 2" title
 *
 * TEST 4: Error Handling
 * ----------------------
 * Steps:
 * 1. Corrupt localStorage data: localStorage.setItem('remember_last_card_set', 'invalid-json')
 * 2. Refresh page
 * 3. Check console for warning and fallback to default card set
 *
 * EXPECTED CONSOLE LOGS:
 * =====================
 * - "FlashcardContext: Using default card set Chinese Essentials 1" (first load)
 * - "CardSetPersistence: Saved card set to localStorage Chinese Essentials 2" (selection)
 * - "CardSetPersistence: Loaded card set from localStorage Chinese Essentials 2" (restore)
 * - "FlashcardContext: Setting current card set [object]" (context update)
 */

console.log("📋 Card Set Persistence Test Plan loaded");
console.log(
  "See comments in /src/utils/persistenceTestPlan.ts for manual test steps"
);

// Helper functions for testing in browser console
if (typeof window !== "undefined") {
  (window as any).checkCardSetPersistence = () => {
    console.log("🔍 Current localStorage state:");
    const stored = localStorage.getItem("remember_last_card_set");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log("✅ Stored card set:", parsed);
        return parsed;
      } catch (e) {
        console.log("❌ Invalid stored data:", stored);
        return null;
      }
    } else {
      console.log("📭 No card set stored");
      return null;
    }
  };

  (window as any).simulateCardSetChange = (
    cardSetId = "chinese_essentials_2"
  ) => {
    const testCardSets = {
      chinese_essentials_1: {
        id: "chinese_essentials_1",
        name: "Chinese Essentials 1",
        cover: "🇨🇳",
        dataFile: "chinese_essentials_in_communication_1.json",
      },
      chinese_essentials_2: {
        id: "chinese_essentials_2",
        name: "Chinese Essentials 2",
        cover: "🏮",
        dataFile: "chinese_essentials_in_communication_2.json",
      },
    };

    const cardSet = testCardSets[cardSetId as keyof typeof testCardSets];
    if (cardSet) {
      localStorage.setItem("remember_last_card_set", JSON.stringify(cardSet));
      console.log("🔄 Simulated card set change to:", cardSet.name);
      console.log("🔄 Reload page to see persistence in action");
    } else {
      console.log("❌ Unknown card set ID:", cardSetId);
    }
  };

  console.log("🛠️ Test helpers available:");
  console.log("- window.checkCardSetPersistence() - Check current state");
  console.log(
    "- window.simulateCardSetChange('chinese_essentials_2') - Simulate selection"
  );
}
