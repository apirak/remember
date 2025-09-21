// Test file to verify card set persistence functionality
// This can be run in browser console to test localStorage operations

import {
  saveLastCardSet,
  loadLastCardSet,
  clearLastCardSet,
  isStorageAvailable,
} from "./cardSetPersistence";

// Test card set data
const testCardSet = {
  id: "chinese_essentials_2",
  name: "Chinese Essentials 2",
  cover: "🏮",
  dataFile: "chinese_essentials_in_communication_2.json",
};

/**
 * Run all persistence tests
 */
export const testCardSetPersistence = () => {
  console.log("🧪 Testing Card Set Persistence...");

  // Test 1: Check if storage is available
  console.log(
    "Test 1: Storage availability -",
    isStorageAvailable() ? "✅ PASS" : "❌ FAIL"
  );

  // Test 2: Clear any existing data
  clearLastCardSet();
  const shouldBeNull = loadLastCardSet();
  console.log(
    "Test 2: Clear storage -",
    shouldBeNull === null ? "✅ PASS" : "❌ FAIL"
  );

  // Test 3: Save card set
  saveLastCardSet(testCardSet);
  console.log("Test 3: Save card set - ✅ PASS (no errors)");

  // Test 4: Load card set
  const loaded = loadLastCardSet();
  const loadTest =
    loaded &&
    loaded.id === testCardSet.id &&
    loaded.name === testCardSet.name &&
    loaded.cover === testCardSet.cover &&
    loaded.dataFile === testCardSet.dataFile;
  console.log("Test 4: Load card set -", loadTest ? "✅ PASS" : "❌ FAIL");

  // Test 5: Verify localStorage directly
  const directCheck = localStorage.getItem("remember_last_card_set");
  console.log(
    "Test 5: Direct localStorage check -",
    directCheck ? "✅ PASS" : "❌ FAIL"
  );

  console.log("🧪 Persistence tests complete!");

  return {
    storageAvailable: isStorageAvailable(),
    clearWorked: shouldBeNull === null,
    loadWorked: loadTest,
    directStorageWorked: !!directCheck,
  };
};

// Auto-run tests if in browser environment
if (typeof window !== "undefined") {
  // Export to window for easy console access
  (window as any).testCardSetPersistence = testCardSetPersistence;
  console.log(
    "Card set persistence test available: window.testCardSetPersistence()"
  );
}
