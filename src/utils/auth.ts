// Authentication utilities for the flashcard application
// Handles sign-up, sign-in, guest mode, and data migration

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  type UserCredential,
  sendPasswordResetEmail,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { auth, isFirebaseError, getFirebaseErrorMessage } from './firebase';

// Authentication state type
export interface AuthState {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
}

// User profile information
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  lastLoginAt: Date;
}

// Authentication result type
export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

// Sign up with email and password
export const signUpWithEmail = async (
  email: string, 
  password: string, 
  displayName?: string
): Promise<AuthResult> => {
  try {
    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }
    
    // Create user account
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    console.log('User signed up successfully:', userCredential.user.uid);
    
    return { 
      success: true, 
      user: userCredential.user 
    };
  } catch (error) {
    console.error('Sign up error:', error);
    
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    
    return { success: false, error: 'Failed to create account. Please try again.' };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
  try {
    // Validate inputs
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    
    // Sign in user
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    
    console.log('User signed in successfully:', userCredential.user.uid);
    
    return { 
      success: true, 
      user: userCredential.user 
    };
  } catch (error) {
    console.error('Sign in error:', error);
    
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    
    return { success: false, error: 'Failed to sign in. Please try again.' };
  }
};

// Sign out current user
export const signOutUser = async (): Promise<AuthResult> => {
  try {
    await signOut(auth);
    console.log('User signed out successfully');
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    
    return { success: false, error: 'Failed to sign out. Please try again.' };
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<AuthResult> => {
  try {
    if (!email) {
      return { success: false, error: 'Email address is required.' };
    }
    
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent to:', email);
    
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    
    return { success: false, error: 'Failed to send password reset email. Please try again.' };
  }
};

// Delete user account (for cleanup purposes)
export const deleteUserAccount = async (): Promise<AuthResult> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: 'No user is currently signed in.' };
    }
    
    await deleteUser(currentUser);
    console.log('User account deleted successfully');
    
    return { success: true };
  } catch (error) {
    console.error('Delete account error:', error);
    
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    
    return { success: false, error: 'Failed to delete account. Please try again.' };
  }
};

// Get current user profile
export const getCurrentUserProfile = (): UserProfile | null => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  
  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    createdAt: currentUser.metadata.creationTime ? new Date(currentUser.metadata.creationTime) : new Date(),
    lastLoginAt: currentUser.metadata.lastSignInTime ? new Date(currentUser.metadata.lastSignInTime) : new Date()
  };
};

// Check if user is currently authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Authentication state observer
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Wait for auth state to be determined
export const waitForAuthState = (): Promise<User | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

// Guest mode utilities
export const GUEST_MODE_KEY = 'flashcard_guest_mode';
export const GUEST_DATA_KEY = 'flashcard_guest_data';

// Check if user is in guest mode
export const isGuestMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(GUEST_MODE_KEY) === 'true';
};

// Enable guest mode
export const enableGuestMode = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(GUEST_MODE_KEY, 'true');
  console.log('Guest mode enabled');
};

// Disable guest mode
export const disableGuestMode = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(GUEST_MODE_KEY);
  sessionStorage.removeItem(GUEST_DATA_KEY);
  console.log('Guest mode disabled');
};

// Get guest data from session storage
export const getGuestData = (): any => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = sessionStorage.getItem(GUEST_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to parse guest data:', error);
    return null;
  }
};

// Save guest data to session storage
export const saveGuestData = (data: any): void => {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(GUEST_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save guest data:', error);
  }
};

// Clear all guest data
export const clearGuestData = (): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(GUEST_DATA_KEY);
};

// Export authentication utilities as default
export default {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
  sendPasswordReset,
  deleteUserAccount,
  getCurrentUserProfile,
  getCurrentUser,
  isAuthenticated,
  onAuthStateChange,
  waitForAuthState,
  isGuestMode,
  enableGuestMode,
  disableGuestMode,
  getGuestData,
  saveGuestData,
  clearGuestData
};