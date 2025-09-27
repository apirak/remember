// Login Button component for Google authentication
// Simple button component that handles Google Sign-In with Firebase

import React, { useState, useEffect } from 'react';
import { signInWithGoogle, signOutUser, getAuthState } from '../../utils/auth';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import type { AppRoute } from '../../types/flashcard';

interface LoginButtonProps {
  // Component no longer needs external auth state change callback
  // as it uses Firebase onAuthStateChanged internally
  onNavigate?: (route: AppRoute) => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({ onNavigate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState(getAuthState());

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      // Update auth state when Firebase auth state changes
      setAuthState(getAuthState());
      console.log(
        'Auth state changed:',
        user ? 'User logged in' : 'User logged out'
      );
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const { user, isAuthenticated } = authState;

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogle();

      if (result.success) {
        console.log('Successfully signed in:', result.user);
        // Auth state will be updated automatically via onAuthStateChanged
      } else {
        setError(result.error || 'An error occurred during login');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signOutUser();

      if (result.success) {
        console.log('Successfully signed out');
        // Auth state will be updated automatically via onAuthStateChanged
      } else {
        setError(result.error || 'An error occurred during logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setError('An error occurred during logout');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated, show profile and logout
  if (isAuthenticated && user) {
    return (
      <div className="space-y-3">
        {/* User Profile */}
        <div className="flex gap-5">
          <div className="flex-1 flex items-center space-x-3">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="hidden w-10 h-10 rounded-full border-2 border-green-300"
              />
            )}
            <div className="flex-1">
              <button
                onClick={() => onNavigate?.('profile')}
                className="text-sm font-rounded font-semibold text-green-800 hover:text-green-600 hover:underline transition-colors duration-200"
              >
                {user.displayName || user.email || 'Logged in'}
              </button>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="
              m-1 py-1 px-2 rounded-md font-rounded text-sm
              text-gray-800 
              hover:bg-red-200 hover:border-red-400 
              hover:text-red-700
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {isLoading ? '⌛ logging out...' : 'Log out'}
          </button>
        </div>

        {error && (
          <div className="text-xs text-red-600 text-center font-rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  // If user is not authenticated, show login button
  return (
    <div className="space-y-3">
      {/* Google Sign-In Button */}
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="
          w-full flex items-center justify-center gap-3 py-2 px-4 
          bg-white border border-gray-300 rounded-3xl
          text-gray-700 text-sm font-rounded font-medium
          hover:bg-gray-50 hover:border-gray-400
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          shadow-sm hover:shadow-md
        "
      >
        {!isLoading && (
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="w-5 h-5"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
        )}
        {isLoading ? '⌛ Signing in...' : 'Continue with Google'}
      </button>

      {/* Benefits of signing in */}
      <div className="text-xs font-rounded text-gray-600 text-center space-y-1">
        <div>To save learning progress</div>
      </div>

      {error && (
        <div className="text-xs text-red-600 text-center font-rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default LoginButton;
