// Main Flashcard Reducer
// Coordinator reducer that delegates actions to specialized domain reducers

import type {
  FlashcardContextState,
  FlashcardAction,
} from "../types/flashcard";
import { sessionReducer, type SessionAction } from "./sessionReducer";
import { cardReducer, type CardAction } from "./cardReducer";
import { appStateReducer, type AppStateAction } from "./appStateReducer";

/**
 * Main reducer function that delegates actions to specialized reducers
 * Uses a pattern where each domain (session, cards, app state) has its own reducer
 * @param state Current flashcard context state
 * @param action Action to process
 * @returns Updated state
 */
export const flashcardReducer = (
  state: FlashcardContextState,
  action: FlashcardAction
): FlashcardContextState => {
  // Check if this is a session action and delegate to session reducer
  if (
    action.type === "START_REVIEW_SESSION" ||
    action.type === "SHOW_CARD_BACK" ||
    action.type === "RATE_CARD" ||
    action.type === "NEXT_CARD" ||
    action.type === "COMPLETE_SESSION" ||
    action.type === "RESET_SESSION"
  ) {
    const sessionUpdates = sessionReducer(state, action as SessionAction);
    return { ...state, ...sessionUpdates };
  }

  // Check if this is a card action and delegate to card reducer
  if (
    action.type === "LOAD_CARDS" ||
    action.type === "UPDATE_STATS" ||
    action.type === "RESET_TODAY_PROGRESS" ||
    action.type === "SET_LOADING"
  ) {
    const cardUpdates = cardReducer(state, action as CardAction);
    return { ...state, ...cardUpdates };
  }

  // Check if this is an app state action and delegate to app state reducer
  if (
    action.type === "SET_LOADING_STATE" ||
    action.type === "SET_DATA_SOURCE" ||
    action.type === "SET_SYNC_STATUS" ||
    action.type === "SET_LAST_SYNC_TIME" ||
    action.type === "SET_ERROR" ||
    action.type === "CLEAR_ERROR" ||
    action.type === "ADD_PENDING_OPERATION" ||
    action.type === "REMOVE_PENDING_OPERATION" ||
    action.type === "RETRY_PENDING_OPERATIONS" ||
    action.type === "SET_MIGRATION_STATUS" ||
    action.type === "SET_USER" ||
    action.type === "SET_CURRENT_CARD_SET"
  ) {
    const appStateUpdates = appStateReducer(state, action as AppStateAction);
    return { ...state, ...appStateUpdates };
  }

  // If we reach here, it's an unknown action type
  console.warn(`Unknown action type: ${(action as any).type}`);
  return state;
};
