// FlashcardAppWithPreload - Wrapper component for handling preloaded card sets
// Automatically loads specified card set and navigates to dashboard

import React, { useEffect } from 'react';
import {
  FlashcardProvider,
  useFlashcard,
} from '../../contexts/FlashcardContext';
import Dashboard from './Dashboard.tsx';
import Review from './Review.tsx';
import Completion from './Completion.tsx';
import CardSetSelection from './CardSetSelection.tsx';
import { DebugPanel } from '../ui/DebugPanel.tsx';

// Navigation types
type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets';

interface FlashcardAppWithPreloadProps {
  preloadCardSet: string;
  cardSetName?: string;
  cardSetDescription?: string;
}

// Content component that handles the preloading logic
const FlashcardAppWithPreloadContent: React.FC<
  FlashcardAppWithPreloadProps
> = ({ preloadCardSet, cardSetName, cardSetDescription }) => {
  const context = useFlashcard();
  const [currentRoute, setCurrentRoute] = React.useState<AppRoute>('dashboard');
  const [isPreloading, setIsPreloading] = React.useState(true);
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

  const { setSelectedCardSet, loadCardSetData } = context;

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
      ];
      if (!validRoutes.includes(route)) {
        console.error(`FlashcardApp: Invalid route '${route}' requested`);
        return;
      }

      setCurrentRoute(route);
    },
    [currentRoute]
  );

  // Preload the specified card set when component mounts
  useEffect(() => {
    // Prevent multiple calls if already preloaded this card set
    if (preloadedRef.current === preloadCardSet) {
      return;
    }

    const preloadCardSetData = async () => {
      if (!preloadCardSet) {
        setIsPreloading(false);
        return;
      }

      // Wait a bit for context to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        console.log(
          `FlashcardAppWithPreload: Preloading card set ${preloadCardSet}`
        );

        // First, load the card set metadata
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

        console.log(`FlashcardAppWithPreload: Found card set:`, cardSet);

        // Set the selected card set in context first
        setSelectedCardSet(cardSet);

        console.log(
          `FlashcardAppWithPreload: Set selected card set, now loading data from ${cardSet.dataFile}`
        );

        // Load the actual card data
        await loadCardSetData(cardSet.dataFile);

        console.log(
          `FlashcardAppWithPreload: Successfully preloaded ${preloadCardSet}`
        );
        preloadedRef.current = preloadCardSet;
        setIsPreloading(false);
      } catch (error) {
        console.error(
          `FlashcardAppWithPreload: Failed to preload card set ${preloadCardSet}:`,
          error
        );
        setIsPreloading(false);
        // Stay on dashboard even if card set fails to load
        // setCurrentRoute("card-sets");
      }
    };

    preloadCardSetData();
  }, [preloadCardSet]); // Remove unstable dependencies

  // Show loading state during preloading
  if (isPreloading) {
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

  // Handle different app routes
  switch (currentRoute) {
    case 'dashboard':
      return <Dashboard onNavigate={handleNavigation} />;
    case 'review':
      return <Review onNavigate={handleNavigation} />;
    case 'complete':
      return <Completion onNavigate={handleNavigation} />;
    case 'card-sets':
      return <CardSetSelection onNavigate={handleNavigation} />;
    default:
      console.error(`FlashcardApp: Unknown route '${currentRoute}'`);
      return <Dashboard onNavigate={handleNavigation} />;
  }
};

// Main wrapper component with FlashcardProvider
const FlashcardAppWithPreload: React.FC<FlashcardAppWithPreloadProps> = (
  props
) => {
  return (
    <div className="app-container">
      <FlashcardProvider>
        <FlashcardAppWithPreloadContent {...props} />
        {/* <DebugPanel /> */}
      </FlashcardProvider>
    </div>
  );
};

export default FlashcardAppWithPreload;
