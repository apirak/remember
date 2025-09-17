// Main index file for Firebase utilities
// Provides a single entry point for all Firebase-related functionality

// Re-export Firebase core utilities
export * from './firebase';
export { default as firebase } from './firebase';

// Re-export authentication utilities
export * from './auth';
export { default as auth } from './auth';

// Re-export Firestore utilities
export * from './firestore';
export { default as firestore } from './firestore';

// Re-export error handling utilities
export * from './errorHandling';
export { default as errorHandling } from './errorHandling';

// Convenience exports for commonly used functions
export {
  // Firebase core
  app,
  auth as firebaseAuth,
  firestore as firestoreDb,
  checkFirebaseConnection,
  getFirebaseErrorMessage
} from './firebase';

export {
  // Authentication
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  isAuthenticated,
  getCurrentUser,
  onAuthStateChange,
  isGuestMode,
  enableGuestMode,
  disableGuestMode,
  getGuestData,
  saveGuestData
} from './auth';

export {
  // Firestore operations
  saveFlashcard,
  saveFlashcardsBatch,
  getUserFlashcards,
  getDueFlashcards,
  updateFlashcardProgress,
  deleteFlashcard,
  migrateGuestDataToUser
} from './firestore';

export {
  // Error handling
  retryOperation,
  getUserFriendlyMessage,
  isRetryableError,
  logError,
  checkNetworkConnectivity
} from './errorHandling';