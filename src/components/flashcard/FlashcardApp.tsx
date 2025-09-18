// Main FlashcardApp component with simple state-based navigation
// Handles navigation between Dashboard, Review, and Completion screens

import React from 'react';
import { FlashcardProvider, useFlashcard } from '../../contexts/FlashcardContext';
import Dashboard from './Dashboard.tsx';
import Review from './Review.tsx';
import Completion from './Completion.tsx';

// Navigation types
type AppRoute = 'dashboard' | 'review' | 'complete';

// Main app wrapper with state-based routing
const FlashcardAppContent: React.FC = () => {
  const { state } = useFlashcard();
  const [currentRoute, setCurrentRoute] = React.useState<AppRoute>('dashboard');

  // Auto-navigate based on session state
  React.useEffect(() => {
    if (state.currentSession) {
      if (state.currentSession.isComplete) {
        setCurrentRoute('complete');
      } else {
        setCurrentRoute('review');
      }
    } else {
      setCurrentRoute('dashboard');
    }
  }, [state.currentSession]);

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case 'review':
        return <Review onNavigate={setCurrentRoute} />;
      case 'complete':
        return <Completion onNavigate={setCurrentRoute} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setCurrentRoute} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      {renderCurrentScreen()}
    </div>
  );
};

// Main app component with context provider
const FlashcardApp: React.FC = () => {
  return (
    <FlashcardProvider>
      <FlashcardAppContent />
    </FlashcardProvider>
  );
};

export default FlashcardApp;