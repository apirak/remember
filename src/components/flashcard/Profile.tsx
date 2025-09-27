/**
 * Profile Component - User Profile Information and Settings
 *
 * Shows authenticated user's profile information including:
 * - User info (name, email, photo)
 * - Account statistics (reviews, progress)
 * - Logout functionality
 * - Navigation back to dashboard
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useFlashcard } from '../../contexts/FlashcardContext';
import type { AppRoute, UserProfile } from '../../types/flashcard';

interface ProfileProps {
  onNavigate: (route: AppRoute) => void;
}

const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { state: authState, signOut } = useAuth();
  const { loadUserProfile, state: flashcardState } = useFlashcard();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Load user profile when component mounts
  useEffect(() => {
    const loadProfile = async () => {
      if (authState.isGuest || !authState.user) {
        // Guest user - redirect to dashboard
        console.log('Profile: Guest user detected, redirecting to dashboard');
        onNavigate('dashboard');
        return;
      }

      try {
        setIsLoading(true);
        const profile = await loadUserProfile();
        setUserProfile(profile);
      } catch (error) {
        console.error('Profile: Error loading user profile:', error);
        // On error, still show basic info from auth state
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [authState.isGuest, authState.user, loadUserProfile, onNavigate]);

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      // Navigation to dashboard will happen automatically via auth state change
    } catch (error) {
      console.error('Profile: Error signing out:', error);
      // Error is already handled by AuthContext
    } finally {
      setIsSigningOut(false);
    }
  };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    console.log('Profile: Navigating back to dashboard');
    onNavigate('dashboard');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center from-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // Get display data (from profile or fallback to auth state)
  const displayName =
    userProfile?.displayName || authState.user?.displayName || 'User';
  const email = userProfile?.email || authState.user?.email || '';
  const photoURL = userProfile?.photoURL || authState.user?.photoURL || '';
  const totalReviewsCount = userProfile?.totalReviewsCount || 0;
  const memberSince = userProfile?.createdAt
    ? new Date(userProfile.createdAt).toLocaleDateString()
    : 'Recently';

  return (
    <div className="min-h-screen from-blue-50">
      <div className="h-screen flex flex-col">
        {/* Navigation Header - Sticky */}
        <div className="sticky top-0 z-10 from-blue-50 backdrop-blur-md border-b border-white/20 p-4 pb-2">
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToDashboard}
                className="flex items-center px-3 py-2 text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
              >
                <span className="mr-2">←</span>
                <span>Back</span>
              </button>

              <h1 className="text-2xl font-child text-gray-700">Profile</h1>

              {/* Spacer for centering */}
              <div className="w-16"></div>
            </div>
          </div>
        </div>

        {/* Profile Content - Scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-md w-full mx-auto p-4 pt-6">
            {/* Profile Card */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-md p-4 mb-4">
              {/* Profile Header */}
              <div className="text-center mb-4">
                {/* Profile Picture */}
                <div className="mb-3">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt={`${displayName}'s profile`}
                      className="w-16 h-16 rounded-full mx-auto border-2 border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full mx-auto border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                      <span className="text-2xl">👤</span>
                    </div>
                  )}
                </div>

                {/* Name and Email */}
                <h2 className="text-lg font-bold font-child text-gray-800 mb-1">
                  {displayName}
                </h2>
                {email && (
                  <p className="text-gray-600 font-rounded text-sm">{email}</p>
                )}
              </div>

              {/* Account Statistics */}
              <div className="mb-4">
                <h3 className="text-lg font-bold font-child text-gray-800 mb-3">
                  Statistics
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Total Reviews */}
                  <div className="bg-gray-50 rounded-2xl p-3 text-center">
                    <div className="text-xl font-bold font-child text-gray-700 mb-1">
                      {totalReviewsCount.toLocaleString()}
                    </div>
                    <div className="text-xs font-rounded text-gray-600">
                      Total Reviews
                    </div>
                  </div>

                  {/* Cards Due Today */}
                  <div className="bg-gray-50 rounded-2xl p-3 text-center">
                    <div className="text-xl font-bold font-child text-gray-700 mb-1">
                      {flashcardState.stats.dueCards}
                    </div>
                    <div className="text-xs font-rounded text-gray-600">
                      Cards Due Today
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="mb-4">
                <h3 className="text-lg font-bold font-child text-gray-800 mb-3">
                  Account Information
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1">
                    <span className="font-rounded text-gray-600 text-sm">
                      Member since:
                    </span>
                    <span className="font-rounded text-gray-800 text-sm">
                      {memberSince}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1">
                    <span className="font-rounded text-gray-600 text-sm">
                      Account type:
                    </span>
                    <span className="font-rounded text-primary-600 font-medium text-sm">
                      Free
                    </span>
                  </div>

                  {userProfile?.migratedFromGuest && (
                    <div className="flex justify-between items-center py-1">
                      <span className="font-rounded text-gray-600 text-sm">
                        Migrated from guest:
                      </span>
                      <span className="font-rounded text-gray-800 text-sm">
                        Yes
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sign Out Section */}
              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className={`
                    w-full py-3 px-4 rounded-2xl font-rounded font-medium transition-all duration-200 text-sm
                    ${
                      isSigningOut
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/20 active:scale-95'
                    }
                  `}
                >
                  {isSigningOut ? <>Signing out...</> : <>Sign out</>}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 pb-4">
              <p className="text-xs font-rounded text-gray-500">
                Your progress is automatically synced across all devices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
