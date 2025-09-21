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
  CARD_SETS: "cardSets",
  CARDS: "cards",
} as const;

// Helper function to get user's cards collection reference for a specific card set
const getUserCardSetCardsCollection = (userId: string, cardSetId: string) => {
  return collection(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS,
    cardSetId,
    COLLECTIONS.CARDS
  );
};

// Helper function to get user's card sets collection reference
const getUserCardSetsCollection = (userId: string) => {
  return collection(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS
  );
};

// Helper function to get user document reference
const getUserDocRef = (userId: string) => {
  return doc(firestore, COLLECTIONS.USERS, userId);
};

// Helper function to get card set document reference
const getCardSetDocRef = (userId: string, cardSetId: string) => {
  return doc(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS,
    cardSetId
  );
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

// Save a single flashcard to Firestore for a specific card set
export const saveFlashcard = async (
  cardData: any,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to save cards.",
      };
    }

    // Use card set-specific collection
    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
    const cardDocRef = doc(cardsCollection, cardData.id);

    const cardWithTimestamp = {
      ...cardData,
      cardSetId, // Add cardSetId to the card data
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

// Save multiple flashcards in a batch operation for a specific card set
export const saveFlashcardsBatch = async (
  cards: any[],
  cardSetId: string
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
    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );

    cards.forEach((cardData) => {
      const cardDocRef = doc(cardsCollection, cardData.id);
      const cardWithTimestamp = {
        ...cardData,
        cardSetId, // Add cardSetId to each card
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

// Get all flashcards for a specific card set
export const getUserFlashcards = async (
  cardSetId: string
): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to get cards.",
      };
    }

    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
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

// Get flashcards due for review for a specific card set
export const getDueFlashcards = async (
  cardSetId: string
): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to get cards.",
      };
    }

    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
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

// Update flashcard progress (SM-2 algorithm results) for a specific card set
export const updateFlashcardProgress = async (
  cardId: string,
  cardSetId: string,
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

    const cardDocRef = doc(
      getUserCardSetCardsCollection(currentUser.uid, cardSetId),
      cardId
    );

    const updateData = {
      ...progressData,
      cardSetId, // Ensure cardSetId is included
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

// Delete a flashcard from a specific card set
export const deleteFlashcard = async (
  cardId: string,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to delete cards.",
      };
    }

    const cardDocRef = doc(
      getUserCardSetCardsCollection(currentUser.uid, cardSetId),
      cardId
    );
    await deleteDoc(cardDocRef);

    console.log("Flashcard deleted:", cardId, "from card set:", cardSetId);
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

    // Migrate flashcards to default card set (chinese_essentials_1)
    const defaultCardSetId = "chinese_essentials_1";
    const migrationResult = await saveFlashcardsBatch(
      guestData.cards,
      defaultCardSetId
    );

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

// Real-time listener for user's flashcards in a specific card set
export const subscribeToUserFlashcards = (
  cardSetId: string,
  callback: (cards: any[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn("User must be authenticated to subscribe to flashcards");
    return () => {};
  }

  const cardsCollection = getUserCardSetCardsCollection(
    currentUser.uid,
    cardSetId
  );
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

// Get all card sets for a user (returns basic metadata, not the cards themselves)
export const getUserCardSets = async (): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to get card sets.",
      };
    }

    const cardSetsCollection = getUserCardSetsCollection(currentUser.uid);
    const cardSetsQuery = query(
      cardSetsCollection,
      orderBy("lastAccessedAt", "desc")
    );

    const querySnapshot = await getDocs(cardSetsQuery);
    const cardSets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      lastAccessedAt: doc.data().lastAccessedAt?.toDate() || new Date(),
    }));

    console.log(`Found ${cardSets.length} card sets for user`);
    return { success: true, data: cardSets };
  } catch (error) {
    console.error("Error getting user card sets:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to get card sets." };
  }
};

// Create or update card set metadata
export const updateCardSetMetadata = async (
  cardSetId: string,
  metadata: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "User must be authenticated to update card set metadata.",
      };
    }

    const cardSetDocRef = getCardSetDocRef(currentUser.uid, cardSetId);

    const updateData = {
      ...metadata,
      lastAccessedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: metadata.createdAt || serverTimestamp(),
    };

    await setDoc(cardSetDocRef, updateData, { merge: true });

    console.log("Card set metadata updated:", cardSetId);
    return { success: true };
  } catch (error) {
    console.error("Error updating card set metadata:", error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: "Failed to update card set metadata." };
  }
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
  getUserCardSets,
  updateCardSetMetadata,
};
