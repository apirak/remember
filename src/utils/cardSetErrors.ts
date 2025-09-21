// Card Set Error Utilities
// Helper functions for creating user-friendly error messages for card set operations

import type { CardSetError, ErrorCode } from "../types/flashcard";

/**
 * Creates a specific error for card set operations with user-friendly messages
 * @param code - The specific error code
 * @param cardSetId - Optional card set ID for context
 * @param dataFile - Optional data file name for context
 * @param originalError - Optional original error for debugging
 * @returns CardSetError with appropriate message and retry behavior
 */
export function createCardSetError(
  code: ErrorCode,
  cardSetId?: string,
  dataFile?: string,
  originalError?: any
): CardSetError {
  const cardSetName = cardSetId ? ` "${cardSetId}"` : "";
  const fileName = dataFile ? ` (${dataFile})` : "";

  let message: string;
  let retryable: boolean;

  switch (code) {
    case "CARD_SET_NOT_FOUND":
      message = `Card set${cardSetName} could not be found${fileName}. Please check if the file exists or try selecting a different card set.`;
      retryable = false;
      break;

    case "CARD_SET_INVALID_DATA":
      message = `Card set${cardSetName} contains invalid data${fileName}. The file might be corrupted or in the wrong format.`;
      retryable = false;
      break;

    case "CARD_SET_LOAD_FAILED":
      message = `Failed to load card set${cardSetName}${fileName}. This might be a temporary issue - please try again.`;
      retryable = true;
      break;

    case "CARD_SET_EMPTY":
      message = `Card set${cardSetName} is empty or contains no valid flashcards${fileName}. Please check the card set data.`;
      retryable = false;
      break;

    case "NETWORK_ERROR":
      message = `Network error while loading card set${cardSetName}. Please check your internet connection and try again.`;
      retryable = true;
      break;

    case "SESSION_ERROR":
      message = `There was an issue with the current review session. Your progress has been saved.`;
      retryable = true;
      break;

    case "FIRESTORE_ERROR":
      message = `Database sync error. Your local progress is safe, but cloud sync may be delayed.`;
      retryable = true;
      break;

    default:
      message = `An unexpected error occurred${
        cardSetName ? ` with card set${cardSetName}` : ""
      }. Please try again.`;
      retryable = true;
      break;
  }

  return {
    code,
    message,
    retryable,
    timestamp: new Date(),
    context: {
      cardSetId,
      dataFile,
      originalError: originalError?.message || originalError,
    },
    cardSetId,
    dataFile,
  };
}

/**
 * Determines the appropriate error code based on the type of error that occurred
 * @param error - The original error object
 * @returns The appropriate ErrorCode
 */
export function getErrorCodeFromException(error: any): ErrorCode {
  const errorMessage = error?.message || error?.toString() || "";

  // Check for specific error patterns
  if (
    errorMessage.includes("Cannot resolve module") ||
    errorMessage.includes("Module not found") ||
    errorMessage.includes("ENOENT")
  ) {
    return "CARD_SET_NOT_FOUND";
  }

  if (
    errorMessage.includes("SyntaxError") ||
    errorMessage.includes("Unexpected token") ||
    errorMessage.includes("JSON.parse")
  ) {
    return "CARD_SET_INVALID_DATA";
  }

  if (
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("NetworkError")
  ) {
    return "NETWORK_ERROR";
  }

  // Default to general load failure
  return "CARD_SET_LOAD_FAILED";
}

/**
 * Validates card set data structure to ensure it meets expected format
 * @param data - The loaded card set data to validate
 * @returns true if valid, throws error if invalid
 */
export function validateCardSetData(data: any): boolean {
  // Check if data exists and is an array
  if (!data || !Array.isArray(data)) {
    throw new Error("Card set data must be an array of flashcards");
  }

  // Check if array is not empty
  if (data.length === 0) {
    throw new Error("Card set contains no flashcards");
  }

  // Validate first few cards to ensure proper structure
  const sampleSize = Math.min(3, data.length);
  for (let i = 0; i < sampleSize; i++) {
    const card = data[i];

    // Check required fields
    if (!card.id || typeof card.id !== "string") {
      throw new Error(`Card at index ${i} is missing required 'id' field`);
    }

    if (!card.front || typeof card.front !== "object") {
      throw new Error(`Card at index ${i} is missing required 'front' field`);
    }

    if (!card.back || typeof card.back !== "object") {
      throw new Error(`Card at index ${i} is missing required 'back' field`);
    }

    // Check front content structure
    if (!card.front.title || typeof card.front.title !== "string") {
      throw new Error(`Card at index ${i} has invalid front title`);
    }

    // Check back content structure
    if (!card.back.title || typeof card.back.title !== "string") {
      throw new Error(`Card at index ${i} has invalid back title`);
    }
  }

  return true;
}
