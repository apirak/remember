// Unit tests for card set persistence utilities
// Tests localStorage operations, error handling, and data validation

import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  saveLastCardSet,
  loadLastCardSet,
  clearLastCardSet,
  isStorageAvailable,
  type StoredCardSet,
} from "../../src/utils/cardSetPersistence";

describe("Card Set Persistence", () => {
  // Test data
  const mockCardSet: StoredCardSet = {
    id: "chinese_essentials_2",
    name: "Chinese Essentials 2",
    cover: "🏮",
    dataFile: "chinese_essentials_in_communication_2.json",
  };

  const mockCardSet2: StoredCardSet = {
    id: "business_chinese",
    name: "Business Chinese",
    cover: "💼",
    dataFile: "business_chinese.json",
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("isStorageAvailable", () => {
    it("should return true when localStorage is available", () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it("should return false when localStorage throws an error", () => {
      // Mock localStorage to throw an error
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        get: () => {
          throw new Error("localStorage not available");
        },
      });

      expect(isStorageAvailable()).toBe(false);

      // Restore localStorage
      Object.defineProperty(window, "localStorage", {
        value: originalLocalStorage,
        writable: true,
      });
    });
  });

  describe("saveLastCardSet", () => {
    it("should save card set to localStorage", () => {
      saveLastCardSet(mockCardSet);

      const stored = localStorage.getItem("remember_last_card_set");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(mockCardSet);
    });

    it("should overwrite existing card set", () => {
      // Save first card set
      saveLastCardSet(mockCardSet);

      // Save second card set
      saveLastCardSet(mockCardSet2);

      const stored = localStorage.getItem("remember_last_card_set");
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(mockCardSet2);
      expect(parsed).not.toEqual(mockCardSet);
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.setItem to throw an error
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
      setItemSpy.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not throw an error
      expect(() => saveLastCardSet(mockCardSet)).not.toThrow();

      setItemSpy.mockRestore();
    });

    it("should log success message", () => {
      const consoleSpy = vi.spyOn(console, "log");

      saveLastCardSet(mockCardSet);

      expect(consoleSpy).toHaveBeenCalledWith(
        "CardSetPersistence: Saved card set to localStorage",
        mockCardSet.name
      );
    });
  });

  describe("loadLastCardSet", () => {
    it("should return null when no data is stored", () => {
      const result = loadLastCardSet();
      expect(result).toBeNull();
    });

    it("should load valid card set from localStorage", () => {
      // Manually set localStorage
      localStorage.setItem(
        "remember_last_card_set",
        JSON.stringify(mockCardSet)
      );

      const result = loadLastCardSet();
      expect(result).toEqual(mockCardSet);
    });

    it("should return null for invalid JSON data", () => {
      // Set invalid JSON
      localStorage.setItem("remember_last_card_set", "invalid-json-data");

      const result = loadLastCardSet();
      expect(result).toBeNull();

      // Should also clear the corrupted data
      expect(localStorage.getItem("remember_last_card_set")).toBeNull();
    });

    it("should return null for incomplete card set data", () => {
      const incompleteData = {
        id: "test",
        name: "Test Set",
        // Missing cover and dataFile
      };

      localStorage.setItem(
        "remember_last_card_set",
        JSON.stringify(incompleteData)
      );

      const result = loadLastCardSet();
      expect(result).toBeNull();
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.getItem to throw an error
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
      getItemSpy.mockImplementation(() => {
        throw new Error("localStorage access denied");
      });

      const result = loadLastCardSet();
      expect(result).toBeNull();

      getItemSpy.mockRestore();
    });

    it("should log success message when loading valid data", () => {
      localStorage.setItem(
        "remember_last_card_set",
        JSON.stringify(mockCardSet)
      );

      const consoleSpy = vi.spyOn(console, "log");

      loadLastCardSet();

      expect(consoleSpy).toHaveBeenCalledWith(
        "CardSetPersistence: Loaded card set from localStorage",
        mockCardSet.name
      );
    });
  });

  describe("clearLastCardSet", () => {
    it("should remove card set from localStorage", () => {
      // First save a card set
      localStorage.setItem(
        "remember_last_card_set",
        JSON.stringify(mockCardSet)
      );
      expect(localStorage.getItem("remember_last_card_set")).toBeTruthy();

      // Clear it
      clearLastCardSet();
      expect(localStorage.getItem("remember_last_card_set")).toBeNull();
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage.removeItem to throw an error
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
      removeItemSpy.mockImplementation(() => {
        throw new Error("localStorage access denied");
      });

      // Should not throw an error
      expect(() => clearLastCardSet()).not.toThrow();

      removeItemSpy.mockRestore();
    });

    it("should log success message", () => {
      const consoleSpy = vi.spyOn(console, "log");

      clearLastCardSet();

      expect(consoleSpy).toHaveBeenCalledWith(
        "CardSetPersistence: Cleared stored card set"
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should handle complete save-load-clear cycle", () => {
      // Save
      saveLastCardSet(mockCardSet);

      // Load and verify
      const loaded = loadLastCardSet();
      expect(loaded).toEqual(mockCardSet);

      // Clear
      clearLastCardSet();

      // Verify cleared
      const afterClear = loadLastCardSet();
      expect(afterClear).toBeNull();
    });

    it("should handle multiple card set switches", () => {
      // Save first card set
      saveLastCardSet(mockCardSet);
      expect(loadLastCardSet()).toEqual(mockCardSet);

      // Switch to second card set
      saveLastCardSet(mockCardSet2);
      expect(loadLastCardSet()).toEqual(mockCardSet2);

      // Switch back to first card set
      saveLastCardSet(mockCardSet);
      expect(loadLastCardSet()).toEqual(mockCardSet);
    });
  });
});
