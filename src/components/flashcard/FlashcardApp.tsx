// Main FlashcardApp component with simple state-based navigation
// Handles navigation between Dashboard, Review, and Completion screens

import React from "react";
import {
  FlashcardProvider,
  useFlashcard,
} from "../../contexts/FlashcardContext";
import Dashboard from "./Dashboard.tsx";
import Review from "./Review.tsx";
import Completion from "./Completion.tsx";

// Navigation types
type AppRoute = "dashboard" | "review" | "complete" | "card-sets";

// Main app wrapper with state-based routing
const FlashcardAppContent: React.FC = () => {
  const { state } = useFlashcard();
  const [currentRoute, setCurrentRoute] = React.useState<AppRoute>("dashboard");

  // Auto-navigate based on session state
  React.useEffect(() => {
    console.log("FlashcardApp navigation check:", {
      hasSession: !!state.currentSession,
      isComplete: state.currentSession?.isComplete,
      currentRoute,
    });

    if (state.currentSession) {
      if (state.currentSession.isComplete) {
        console.log("Session complete, navigating to complete screen");
        setCurrentRoute("complete");
      } else {
        console.log("Session active, navigating to review screen");
        setCurrentRoute("review");
      }
    } else {
      console.log("No session, navigating to dashboard");
      setCurrentRoute("dashboard");
    }
  }, [state.currentSession?.isComplete, state.currentSession]);

  // Render current screen
  const renderCurrentScreen = () => {
    switch (currentRoute) {
      case "review":
        return <Review onNavigate={setCurrentRoute} />;
      case "complete":
        return <Completion onNavigate={setCurrentRoute} />;
      case "card-sets":
        console.log("Navigating to card sets selection screen");
        // TODO: Replace with actual CardSetSelection component in Step 2
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg text-center">
              <h1 className="text-2xl font-bold mb-4">Card Sets</h1>
              <p className="text-gray-600 mb-4">Coming soon...</p>
              <button
                onClick={() => {
                  console.log("Navigating back to dashboard from card sets");
                  setCurrentRoute("dashboard");
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );
      case "dashboard":
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
