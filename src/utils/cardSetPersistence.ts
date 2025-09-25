// Card Set Persistence - localStorage utility for remembering user's selected card set
// Provides simple get/set methods with error handling for card set persistence

/**
 * Type definition for stored card set data
 * Matches the structure used in FlashcardContext
 */
// Import CardSet type for type checking
import type { CardSet } from '../types/flashcard';

// StoredCardSet can now be a complete CardSet or the minimal format for backwards compatibility
export type StoredCardSet = CardSet | {
  id: string;
  name: string;
  cover: string;
  dataFile: string;
};

// localStorage key for card set persistence
const CARD_SET_STORAGE_KEY = "remember_last_card_set";

/**
 * Save the current card set to localStorage
 * @param cardSet - The card set to persist
 */
export const saveLastCardSet = (cardSet: StoredCardSet | CardSet): void => {
  try {
    const cardSetData = JSON.stringify(cardSet);
    localStorage.setItem(CARD_SET_STORAGE_KEY, cardSetData);
    console.log(
      "CardSetPersistence: Saved card set to localStorage",
      cardSet.name
    );
  } catch (error) {
    console.warn(
      "CardSetPersistence: Failed to save card set to localStorage",
      error
    );
    // Not a critical error - app continues to work without persistence
  }
};

/**
 * Load the last selected card set from localStorage
 * @returns The stored card set or null if none exists/invalid
 */
export const loadLastCardSet = (): StoredCardSet | null => {
  try {
    const storedData = localStorage.getItem(CARD_SET_STORAGE_KEY);

    if (!storedData) {
      console.log("CardSetPersistence: No stored card set found");
      return null;
    }

    const cardSet = JSON.parse(storedData) as StoredCardSet;

    // Basic validation of stored data structure
    if (!cardSet.id || !cardSet.name || !cardSet.cover || !cardSet.dataFile) {
      console.warn(
        "CardSetPersistence: Stored card set data is incomplete, ignoring"
      );
      return null;
    }

    // Check if it's a complete CardSet (has additional properties) or minimal format
    const isComplete = 'description' in cardSet && 'cardCount' in cardSet;
    console.log(
      `CardSetPersistence: Loaded ${isComplete ? 'complete' : 'minimal'} card set from localStorage`,
      cardSet.name
    );

    console.log(
      "CardSetPersistence: Loaded card set from localStorage",
      cardSet.name
    );
    return cardSet;
  } catch (error) {
    console.warn(
      "CardSetPersistence: Failed to load card set from localStorage",
      error
    );
    // Clear corrupted data
    clearLastCardSet();
    return null;
  }
};

/**
 * Clear the stored card set (useful for error recovery)
 */
export const clearLastCardSet = (): void => {
  try {
    localStorage.removeItem(CARD_SET_STORAGE_KEY);
    console.log("CardSetPersistence: Cleared stored card set");
  } catch (error) {
    console.warn("CardSetPersistence: Failed to clear stored card set", error);
  }
};

/**
 * Check if localStorage is available (for SSR compatibility)
 * @returns true if localStorage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
};
