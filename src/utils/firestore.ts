// Firestore utilities for flashcard data management
// Handles CRUD operations for flashcards and user progress with optimistic updates

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
  type WriteBatch,
} from "firebase/firestore";
import {
  firestore,
  isFirebaseError,
  getFirebaseErrorMessage,
} from "./firebase";
import { getCurrentUser } from "./auth";

// Firestore operation result type
export interface FirestoreResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: "users",
  CARDS: "cards",
} as const;

// Helper function to get user's cards collection reference
const getUserCardsCollection = (userId: string) => {
  return collection(firestore, COLLECTIONS.USERS, userId, COLLECTIONS.CARDS);
};

// Helper function to get user document reference
const getUserDocRef = (userId: string) => {
  return doc(firestore, COLLECTIONS.USERS, userId);
};

// Create or update user profile in Firestore
export const createUserProfile = async (
  userId: string,
  profileData: any
): Promise<FirestoreResult> => {
  try {
    const userDocRef = getUserDocRef(userId);

    const userData = {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userDocRef, userData, { merge: true });

    console.log("User profile created/updated:", userId);
    return { success: true, data: userData };
  } catch (error) {
    console.error("Error creating user profile:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to create user profile." };
  }
};

// Get user profile from Firestore
export const getUserProfile = async (
  userId: string
): Promise<FirestoreResult> => {
  try {
    const userDocRef = getUserDocRef(userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return { success: true, data: userData };
    } else {
      return { success: false, error: "User profile not found." };
    }
  } catch (error) {
    console.error("Error getting user profile:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to get user profile." };
  }
};

// Save a single flashcard to Firestore
export const saveFlashcard = async (
  cardData: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to save cards.",
      };
    }

    const cardsCollection = getUserCardsCollection(currentUser.uid);
    const cardDocRef = doc(cardsCollection, cardData.id);

    const cardWithTimestamp = {
      ...cardData,
      updatedAt: serverTimestamp(),
      createdAt: cardData.createdAt || serverTimestamp(),
    };

    await setDoc(cardDocRef, cardWithTimestamp, { merge: true });

    console.log("Flashcard saved:", cardData.id);
    return { success: true, data: cardWithTimestamp };
  } catch (error) {
    console.error("Error saving flashcard:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to save flashcard." };
  }
};

// Save multiple flashcards in a batch operation
export const saveFlashcardsBatch = async (
  cards: any[]
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to save cards.",
      };
    }

    const batch: WriteBatch = writeBatch(firestore);
    const cardsCollection = getUserCardsCollection(currentUser.uid);

    cards.forEach((cardData) => {
      const cardDocRef = doc(cardsCollection, cardData.id);
      const cardWithTimestamp = {
        ...cardData,
        updatedAt: serverTimestamp(),
        createdAt: cardData.createdAt || serverTimestamp(),
      };

      batch.set(cardDocRef, cardWithTimestamp, { merge: true });
    });

    await batch.commit();

    console.log(`${cards.length} flashcards saved in batch`);
    return { success: true, data: cards };
  } catch (error) {
    console.error("Error saving flashcards batch:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to save flashcards." };
  }
};

// Get all flashcards for the current user
export const getUserFlashcards = async (): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to get cards.",
      };
    }

    const cardsCollection = getUserCardsCollection(currentUser.uid);
    const cardsQuery = query(cardsCollection, orderBy("createdAt", "desc"));

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(
      cardsQuery
    );
    const cards = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to Date objects
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
      lastReviewDate: doc.data().lastReviewDate?.toDate() || new Date(), // ← Fix: Convert lastReviewDate timestamp
    }));

    console.log(`Retrieved ${cards.length} flashcards`);
    return { success: true, data: cards };
  } catch (error) {
    console.error("Error getting flashcards:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to get flashcards." };
  }
};

// Get flashcards due for review
export const getDueFlashcards = async (): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to get cards.",
      };
    }

    const cardsCollection = getUserCardsCollection(currentUser.uid);
    const now = Timestamp.fromDate(new Date());

    const dueCardsQuery = query(
      cardsCollection,
      where("nextReviewDate", "<=", now),
      orderBy("nextReviewDate", "asc")
    );

    const querySnapshot: QuerySnapshot<DocumentData> = await getDocs(
      dueCardsQuery
    );
    const dueCards = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
    }));

    console.log(`Retrieved ${dueCards.length} due flashcards`);
    return { success: true, data: dueCards };
  } catch (error) {
    console.error("Error getting due flashcards:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to get due flashcards." };
  }
};

// Update flashcard progress (SM-2 algorithm results)
export const updateFlashcardProgress = async (
  cardId: string,
  progressData: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to update progress.",
      };
    }

    const cardDocRef = doc(getUserCardsCollection(currentUser.uid), cardId);

    const updateData = {
      ...progressData,
      updatedAt: serverTimestamp(),
      // Convert Date objects to Firestore timestamps for storage
      nextReviewDate: progressData.nextReviewDate
        ? Timestamp.fromDate(progressData.nextReviewDate)
        : serverTimestamp(),
    };

    await updateDoc(cardDocRef, updateData);

    console.log("Flashcard progress updated:", cardId);
    return { success: true, data: updateData };
  } catch (error) {
    console.error("Error updating flashcard progress:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to update flashcard progress." };
  }
};

// Delete a flashcard
export const deleteFlashcard = async (
  cardId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to delete cards.",
      };
    }

    const cardDocRef = doc(getUserCardsCollection(currentUser.uid), cardId);
    await deleteDoc(cardDocRef);

    console.log("Flashcard deleted:", cardId);
    return { success: true };
  } catch (error) {
    console.error("Error deleting flashcard:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to delete flashcard." };
  }
};

// Migrate guest data to user account (for sign-up conversion)
export const migrateGuestDataToUser = async (
  guestData: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to migrate data.",
      };
    }

    if (!guestData || !Array.isArray(guestData.cards)) {
      return { success: false, error: "No valid guest data to migrate." };
    }

    // Create user profile
    await createUserProfile(currentUser.uid, {
      email: currentUser.email,
      displayName: currentUser.displayName,
      migratedFromGuest: true,
      migrationDate: serverTimestamp(),
    });

    // Migrate flashcards
    const migrationResult = await saveFlashcardsBatch(guestData.cards);

    if (migrationResult.success) {
      console.log(
        `Successfully migrated ${guestData.cards.length} cards from guest mode`
      );
      return { success: true, data: guestData.cards };
    } else {
      return migrationResult;
    }
  } catch (error) {
    console.error("Error migrating guest data:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to migrate guest data." };
  }
};

// Real-time listener for user's flashcards (optional, for future use)
export const subscribeToUserFlashcards = (
  callback: (cards: any[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn("User must be authenticated to subscribe to flashcards");
    return () => {};
  }

  const cardsCollection = getUserCardsCollection(currentUser.uid);
  const cardsQuery = query(cardsCollection, orderBy("createdAt", "desc"));

  return onSnapshot(
    cardsQuery,
    (querySnapshot) => {
      const cards = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
      }));

      callback(cards);
    },
    (error) => {
      console.error("Error in flashcards subscription:", error);
    }
  );
};

// Export Firestore utilities as default
export default {
  createUserProfile,
  getUserProfile,
  saveFlashcard,
  saveFlashcardsBatch,
  getUserFlashcards,
  getDueFlashcards,
  updateFlashcardProgress,
  deleteFlashcard,
  migrateGuestDataToUser,
  subscribeToUserFlashcards,
};
