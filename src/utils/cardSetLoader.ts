// Card Set Loader Utility
// Uses fetch API for reliable loading in both development and production
// Automatically works with any JSON files in the data directory

import type { FlashcardData } from "../types/flashcard";

/**
 * Load card set data using fetch API instead of dynamic imports
 * This works reliably in both development and production builds
 * @param dataFile - The JSON file name to load (e.g., "business_chinese.json")
 * @returns Promise resolving to card set data
 */
export const loadCardSetDataWithFetch = async (
  dataFile: string
): Promise<FlashcardData[]> => {
  console.log(`Loading card set data via fetch: ${dataFile}`);

  // Normalize the file name (ensure .json extension)
  const fileName = dataFile.endsWith(".json") ? dataFile : `${dataFile}.json`;

  // Use the same path for both dev and production (public/data/)
  const filePath = `/data/${fileName}`;

  try {
    console.log(`Fetching card set from: ${filePath}`);
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(
        `Failed to load card set "${fileName}": ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as FlashcardData[];

    if (!Array.isArray(data)) {
      throw new Error(
        `Invalid card set data format in "${fileName}": Expected array, got ${typeof data}`
      );
    }

    console.log(`Successfully loaded ${data.length} cards from ${fileName}`);
    return data;
  } catch (error) {
    console.error(`Error loading card set from ${filePath}:`, error);

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error(
        `Network error while loading card set "${fileName}". Please check your internet connection and try again.`
      );
    }

    throw error;
  }
};

/**
 * Check if a card set file exists by attempting a HEAD request
 * @param dataFile - The JSON file name to check
 * @returns Promise resolving to boolean indicating if the file exists
 */
export const checkCardSetExists = async (
  dataFile: string
): Promise<boolean> => {
  try {
    const fileName = dataFile.endsWith(".json") ? dataFile : `${dataFile}.json`;
    const filePath = `/data/${fileName}`;

    const response = await fetch(filePath, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
};
