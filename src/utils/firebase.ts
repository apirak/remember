// Firebase configuration and initialization
// This file contains the Firebase setup and utility functions for authentication and Firestore

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, type Analytics } from 'firebase/analytics';

// Firebase configuration object - hardcoded as per requirements
const firebaseConfig = {
  apiKey: "AIzaSyDPQE3fesCq9nN84-zVBYHJRyMUR-pWgLk",
  authDomain: "remember-me-c8da6.firebaseapp.com",
  projectId: "remember-me-c8da6",
  storageBucket: "remember-me-c8da6.firebasestorage.app",
  messagingSenderId: "818564421697",
  appId: "1:818564421697:web:f2abcf83ca42a9c3978ec0",
  measurementId: "G-ZK2QES54E1"
};

// Initialize Firebase app
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let analytics: Analytics | null = null;

try {
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services
  auth = getAuth(app);
  firestore = getFirestore(app);
  
  // Initialize Analytics only in browser environment
  if (typeof window !== 'undefined') {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      console.warn('Analytics initialization failed:', error);
      // Analytics is optional, continue without it
    }
  }
  
  // Expose Firebase app to window for debugging in development
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    window.firebaseApp = app;
  }
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  throw new Error('Failed to initialize Firebase. Please check the configuration.');
}

// Export Firebase services
export { app, auth, firestore, analytics };

// Export Firebase configuration for reference
export { firebaseConfig };

// Type definitions for Firebase errors
export interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

// Helper function to check if an error is a Firebase error
export const isFirebaseError = (error: any): error is FirebaseError => {
  return error && typeof error === 'object' && 'code' in error && 'message' in error;
};

// Firebase connection status checker
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    // Simple connectivity test by checking auth state
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(
        () => {
          unsubscribe();
          resolve(true);
        },
        (error) => {
          console.error('Firebase connection error:', error);
          unsubscribe();
          resolve(false);
        }
      );
      
      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, 5000);
    });
  } catch (error) {
    console.error('Firebase connection check failed:', error);
    return false;
  }
};

// Firebase error message mapper for user-friendly errors
export const getFirebaseErrorMessage = (error: FirebaseError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'permission-denied':
      return 'You don\'t have permission to access this data.';
    case 'unavailable':
      return 'Service is currently unavailable. Please try again later.';
    case 'cancelled':
      return 'Operation was cancelled.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Export a default Firebase instance for convenience
export default {
  app,
  auth,
  firestore,
  analytics,
  checkConnection: checkFirebaseConnection,
  getErrorMessage: getFirebaseErrorMessage,
  isFirebaseError
};