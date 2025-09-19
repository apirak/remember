// Login Button component for Google authentication
// Simple button component that handles Google Sign-In with Firebase

import React, { useState, useEffect } from "react";
import { signInWithGoogle, signOutUser, getAuthState } from "../../utils/auth";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../utils/firebase";

interface LoginButtonProps {
  // Component no longer needs external auth state change callback
  // as it uses Firebase onAuthStateChanged internally
}

const LoginButton: React.FC<LoginButtonProps> = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState(getAuthState());

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      // Update auth state when Firebase auth state changes
      setAuthState(getAuthState());
      console.log(
        "Auth state changed:",
        user ? "User logged in" : "User logged out"
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
        console.log("Successfully signed in:", result.user);
        // Auth state will be updated automatically via onAuthStateChanged
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
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
        console.log("Successfully signed out");
        // Auth state will be updated automatically via onAuthStateChanged
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการออกจากระบบ");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setError("เกิดข้อผิดพลาดในการออกจากระบบ");
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated, show profile and logout
  if (isAuthenticated && user) {
    return (
      <div className="space-y-3">
        {/* User Profile */}
        <div className="flex bg-green-50 rounded-xl border border-green-200">
          <div className="flex-1 flex items-center space-x-3">
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt="Profile"
                className="hidden w-10 h-10 rounded-full border-2 border-green-300"
              />
            )}
            <div className="flex-1">
              <div className="text-sm font-rounded font-semibold text-green-800">
                {user.displayName || user.email || "ผู้ใช้"}
              </div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="
              m-1 py-1 px-2 rounded-md font-rounded text-sm
              text-gray-800 
              hover:bg-red-200 hover:border-red-400 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            "
          >
            {isLoading ? "⌛ logging out..." : "Log out"}
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
      {/* Login Button */}
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="
          w-full py-3 px-4 rounded-xl font-rounded text-sm font-medium
          bg-blue-600 text-white border border-blue-600
          hover:bg-blue-700 hover:border-blue-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors duration-200
          shadow-md hover:shadow-lg
        "
      >
        {isLoading ? "⌛ logging in..." : "🔑 Sign in with Google"}
      </button>

      {/* Benefits of signing in */}
      <div className="text-xs font-rounded text-gray-600 text-center space-y-1">
        <div>💾 บันทึกความคืบหน้าการเรียนรู้</div>
        <div>📊 ติดตามสถิติการทบทวน</div>
        <div>☁️ ซิงค์ข้อมูลข้ามอุปกรณ์</div>
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
