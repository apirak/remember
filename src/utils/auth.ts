// Authentication utilities - Google Sign-In only
// Simplified authentication using only Google Sign-In for the Remember app

import { 
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

// User profile interface
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

// Authentication result interface
export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// Error messages in Thai
const ERROR_MESSAGES = {
  'auth/popup-closed-by-user': 'ผู้ใช้ปิดหน้าต่างการเข้าสู่ระบบ',
  'auth/popup-blocked': 'เบราว์เซอร์บล็อกหน้าต่างการเข้าสู่ระบบ กรุณาอนุญาต popup',
  'auth/cancelled-popup-request': 'การเข้าสู่ระบบถูกยกเลิก',
  'auth/network-request-failed': 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้',
  'auth/user-disabled': 'บัญชีนี้ถูกระงับการใช้งาน',
  'auth/operation-not-allowed': 'ไม่อนุญาตให้ใช้วิธีการเข้าสู่ระบบนี้',
  'default': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง'
};

// Get error message in Thai
const getErrorMessage = (errorCode: string): string => {
  return ERROR_MESSAGES[errorCode as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default;
};

// Convert Firebase user to UserProfile
const createUserProfile = (user: User): UserProfile => {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isGuest: false,
  };
};

// Google Sign-In function
export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    console.log('Starting Google Sign-In...');
    
    const provider = new GoogleAuthProvider();
    
    // Configure the provider
    provider.addScope('email');
    provider.addScope('profile');
    
    // Sign in with popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    console.log('Google Sign-In successful:', {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    });
    
    return {
      success: true,
      user: createUserProfile(user)
    };
    
  } catch (error: any) {
    console.error('Google Sign-In error:', error);
    
    const errorCode = error?.code || 'default';
    const errorMessage = getErrorMessage(errorCode);
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Sign out function
export const signOutUser = async (): Promise<AuthResult> => {
  try {
    console.log('Signing out user...');
    await signOut(auth);
    
    // Clear guest mode
    disableGuestMode();
    
    console.log('Sign out successful');
    return { success: true };
    
  } catch (error: any) {
    console.error('Sign out error:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในการออกจากระบบ'
    };
  }
};

// Get current user profile
export const getCurrentUserProfile = (): UserProfile | null => {
  const user = auth.currentUser;
  return user ? createUserProfile(user) : null;
};

// Auth state change listener
export const onAuthStateChange = (callback: (user: User | null) => void): (() => void) => {
  return onAuthStateChanged(auth, callback);
};

// Guest mode management
const GUEST_MODE_KEY = 'remember_guest_mode';

export const isGuestMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(GUEST_MODE_KEY) === 'true';
};

export const enableGuestMode = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_MODE_KEY, 'true');
  console.log('Guest mode enabled');
};

export const disableGuestMode = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_MODE_KEY);
  console.log('Guest mode disabled');
};

// Convenience function to check if user is authenticated (either Firebase or guest)
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null || isGuestMode();
};

// Get current authentication state
export const getAuthState = () => {
  return {
    user: auth.currentUser,
    userProfile: getCurrentUserProfile(),
    isGuest: isGuestMode(),
    isAuthenticated: isAuthenticated()
  };
};
