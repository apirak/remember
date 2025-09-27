// Main FlashcardApp component with simple state-based navigation
// Handles navigation between Dashboard, Review, and Completion screens
// Also supports preloading specific card sets when provided

import React, { useEffect } from 'react';
import {
  FlashcardProvider,
  useFlashcard,
} from '../../contexts/FlashcardContext';
import { AuthProvider } from '../../contexts/AuthContext';
import Dashboard from './Dashboard.tsx';
import Review from './Review.tsx';
import Completion from './Completion.tsx';
import CardSetSelection from './CardSetSelection.tsx';
import Profile from './Profile.tsx';
import { DebugPanel } from '../ui/DebugPanel.tsx';

// Navigation types
type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile';

// Props interface - supports both regular and preload modes
interface FlashcardAppProps {
  preloadCardSet?: string;
  cardSetName?: string;
  cardSetDescription?: string;
}

// Main app wrapper with state-based routing
const FlashcardAppContent: React.FC<FlashcardAppProps> = ({
  preloadCardSet,
  cardSetName,
  cardSetDescription,
}) => {
  const context = useFlashcard();

  // Determine initial route based on preload mode
  const initialRoute: AppRoute = preloadCardSet ? 'dashboard' : 'card-sets';
  const [currentRoute, setCurrentRoute] =
    React.useState<AppRoute>(initialRoute);
  const [isPreloading, setIsPreloading] = React.useState(!!preloadCardSet);
  const preloadedRef = React.useRef<string | null>(null);

  // Check if context is available
  if (!context) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-rounded text-gray-600">
            Loading context...
          </p>
        </div>
      </div>
    );
  }

  const { state, setSelectedCardSet, loadCardSetData } = context;

  // Preload the specified card set when component mounts (only for preload mode)
  useEffect(() => {
    if (!preloadCardSet || preloadedRef.current === preloadCardSet) {
      return;
    }

    const preloadCardSetData = async () => {
      try {
        console.log(`FlashcardApp: Preloading card set ${preloadCardSet}`);

        // Load card set metadata
        const response = await fetch('/data/card_set.json');
        if (!response.ok) {
          throw new Error(`Failed to load card sets: ${response.status}`);
        }

        const cardSetsData = await response.json();
        const cardSet = cardSetsData.find(
          (set: any) => set.id === preloadCardSet
        );

        if (!cardSet) {
          throw new Error(`Card set with ID '${preloadCardSet}' not found`);
        }

        console.log(`FlashcardApp: Found card set:`, cardSet);

        // Set the selected card set in context first
        setSelectedCardSet(cardSet);

        console.log(
          `FlashcardApp: Set selected card set, now loading data from ${cardSet.dataFile}`
        );

        // Load the actual card data
        await loadCardSetData(cardSet.dataFile);

        console.log(`FlashcardApp: Successfully preloaded ${preloadCardSet}`);
        preloadedRef.current = preloadCardSet;
        setIsPreloading(false);
      } catch (error) {
        console.error(
          `FlashcardApp: Failed to preload card set ${preloadCardSet}:`,
          error
        );
        setIsPreloading(false);
      }
    };

    preloadCardSetData();
  }, [preloadCardSet, setSelectedCardSet, loadCardSetData]);

  // Safe navigation handler with validation
  const handleNavigation = React.useCallback(
    (route: AppRoute) => {
      console.log(
        `FlashcardApp: Navigation requested to '${route}' from '${currentRoute}'`
      );

      // Validate route exists in AppRoute type
      const validRoutes: AppRoute[] = [
        'dashboard',
        'review',
        'complete',
        'card-sets',
        'profile',
      ];
      if (!validRoutes.includes(route)) {
        console.error(
          `FlashcardApp: Invalid route '${route}', staying on current route`
        );
        return;
      }

      setCurrentRoute(route);
    },
    [currentRoute]
  );

  // Auto-navigate based on session state
  React.useEffect(() => {
    console.log('FlashcardApp navigation check:', {
      hasSession: !!state.currentSession,
      isComplete: state.currentSession?.isComplete,
      currentRoute,
      savingProgress: state.loadingStates?.savingProgress,
    });

    // Don't navigate while batch save is in progress to avoid race conditions
    if (state.loadingStates?.savingProgress) {
      console.log('Batch save in progress, deferring navigation...');
      return;
    }

    // Only auto-navigate if there's an active session or session just completed
    if (state.currentSession) {
      if (state.currentSession.isComplete) {
        console.log('Session complete, navigating to complete screen');
        handleNavigation('complete');
      } else {
        console.log('Session active, navigating to review screen');
        handleNavigation('review');
      }
    } else if (currentRoute === 'review' || currentRoute === 'complete') {
      // Only auto-navigate to dashboard if coming from review/complete routes
      // Preserve manual navigation to card-sets route
      console.log('No session, navigating from review/complete to dashboard');
      handleNavigation('dashboard');
    }
    // Note: card-sets route is preserved for manual navigation
  }, [
    state.currentSession?.isComplete,
    state.currentSession,
    currentRoute,
    handleNavigation,
    state.loadingStates?.savingProgress, // Add this to dependencies
  ]);

  // Show loading state during preloading
  if (isPreloading && preloadCardSet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-rounded text-gray-600">
            Loading {cardSetName || preloadCardSet}...
          </p>
          {cardSetDescription && (
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              {cardSetDescription}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render current screen
  const renderCurrentScreen = () => {
    console.log(`FlashcardApp: Rendering route '${currentRoute}'`);

    switch (currentRoute) {
      case 'review':
        return <Review onNavigate={handleNavigation} />;
      case 'complete':
        return <Completion onNavigate={handleNavigation} />;
      case 'card-sets':
        console.log('Navigating to card sets selection screen');
        return <CardSetSelection onNavigate={handleNavigation} />;
      case 'profile':
        console.log('Navigating to profile screen');
        return <Profile onNavigate={handleNavigation} />;
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigation} />;
      default:
        // Defensive handling for invalid routes
        console.warn(
          `FlashcardApp: Unknown route '${currentRoute}', falling back to dashboard`
        );
        setCurrentRoute('dashboard');
        return <Dashboard onNavigate={handleNavigation} />;
    }
  };

  return renderCurrentScreen();
};

// Main app component with context providers
const FlashcardApp: React.FC<FlashcardAppProps> = (props) => {
  const [debugPanelVisible, setDebugPanelVisible] = React.useState(false);

  return (
    <AuthProvider>
      <FlashcardProvider>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 flex">
          {/* Main content area */}
          <div className="flex-1">
            <FlashcardAppContent {...props} />
          </div>
          {/* Debug Panel as right sidebar */}
          <DebugPanel
            position="right"
            defaultVisible={false}
            visible={debugPanelVisible}
            onVisibilityChange={setDebugPanelVisible}
          />
        </div>
      </FlashcardProvider>
    </AuthProvider>
  );
};

export default FlashcardApp;
