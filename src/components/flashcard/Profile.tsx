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
import EmojiText from '../EmojiSVG';
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <span className="mr-2">←</span>
            <span className="font-rounded">Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold font-child text-gray-800">
            <EmojiText size={24}>👤</EmojiText> Profile
          </h1>
          <div className="w-24"></div> {/* Spacer for center alignment */}
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-8 text-white text-center">
            {/* Profile Picture */}
            <div className="mb-4">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={`${displayName}'s profile`}
                  className="w-20 h-20 rounded-full mx-auto border-4 border-white/30 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto border-4 border-white/30 bg-white/20 flex items-center justify-center">
                  <EmojiText size={32}>👤</EmojiText>
                </div>
              )}
            </div>

            {/* Name and Email */}
            <h2 className="text-xl font-bold font-child mb-1">{displayName}</h2>
            {email && (
              <p className="text-primary-100 font-rounded text-sm">{email}</p>
            )}
          </div>

          {/* Profile Information */}
          <div className="p-6 space-y-6">
            {/* Account Statistics */}
            <div>
              <h3 className="text-lg font-bold font-child text-gray-800 mb-4">
                <EmojiText size={18}>📊</EmojiText> Account Statistics
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Total Reviews */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold font-child text-green-600 mb-1">
                    {totalReviewsCount.toLocaleString()}
                  </div>
                  <div className="text-sm font-rounded text-green-700">
                    Total Reviews
                  </div>
                </div>

                {/* Cards Due Today */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold font-child text-blue-600 mb-1">
                    {flashcardState.stats.dueCards}
                  </div>
                  <div className="text-sm font-rounded text-blue-700">
                    Cards Due Today
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-bold font-child text-gray-800 mb-4">
                <EmojiText size={18}>ℹ️</EmojiText> Account Information
              </h3>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="font-rounded text-gray-600">
                    Member since:
                  </span>
                  <span className="font-rounded text-gray-800">
                    {memberSince}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="font-rounded text-gray-600">
                    Account type:
                  </span>
                  <span className="font-rounded text-primary-600 font-medium">
                    <EmojiText size={14}>✨</EmojiText> Premium
                  </span>
                </div>

                {userProfile?.migratedFromGuest && (
                  <div className="flex justify-between items-center py-2">
                    <span className="font-rounded text-gray-600">
                      Migrated from guest:
                    </span>
                    <span className="font-rounded text-gray-800">
                      <EmojiText size={14}>✅</EmojiText> Yes
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sign Out Section */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className={`
                  w-full py-3 px-6 rounded-2xl font-rounded font-medium transition-all duration-200
                  ${
                    isSigningOut
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/20 active:scale-95'
                  }
                `}
              >
                {isSigningOut ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    Signing out...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <EmojiText size={16}>🚪</EmojiText>
                    <span className="ml-2">Sign Out</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm font-rounded text-gray-500">
            Your progress is automatically synced across all devices
          </p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
