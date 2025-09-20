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
import CardSetSelection from "./CardSetSelection.tsx";

// Navigation types
type AppRoute = "dashboard" | "review" | "complete" | "card-sets";

// Main app wrapper with state-based routing
const FlashcardAppContent: React.FC = () => {
  const { state } = useFlashcard();
  const [currentRoute, setCurrentRoute] = React.useState<AppRoute>("dashboard");

  // Safe navigation handler with validation
  const handleNavigation = React.useCallback(
    (route: AppRoute) => {
      console.log(
        `FlashcardApp: Navigation requested to '${route}' from '${currentRoute}'`
      );

      // Validate route exists in AppRoute type
      const validRoutes: AppRoute[] = [
        "dashboard",
        "review",
        "complete",
        "card-sets",
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
    console.log("FlashcardApp navigation check:", {
      hasSession: !!state.currentSession,
      isComplete: state.currentSession?.isComplete,
      currentRoute,
    });

    // Only auto-navigate if there's an active session or session just completed
    if (state.currentSession) {
      if (state.currentSession.isComplete) {
        console.log("Session complete, navigating to complete screen");
        handleNavigation("complete");
      } else {
        console.log("Session active, navigating to review screen");
        handleNavigation("review");
      }
    } else if (currentRoute === "review" || currentRoute === "complete") {
      // Only auto-navigate to dashboard if coming from review/complete routes
      // Preserve manual navigation to card-sets route
      console.log("No session, navigating from review/complete to dashboard");
      handleNavigation("dashboard");
    }
    // Note: card-sets route is preserved for manual navigation
  }, [
    state.currentSession?.isComplete,
    state.currentSession,
    currentRoute,
    handleNavigation,
  ]);

  // Render current screen
  const renderCurrentScreen = () => {
    console.log(`FlashcardApp: Rendering route '${currentRoute}'`);

    switch (currentRoute) {
      case "review":
        return <Review onNavigate={handleNavigation} />;
      case "complete":
        return <Completion onNavigate={handleNavigation} />;
      case "card-sets":
        console.log("Navigating to card sets selection screen");
        return <CardSetSelection onNavigate={handleNavigation} />;
      case "dashboard":
        return <Dashboard onNavigate={handleNavigation} />;
      default:
        // Defensive handling for invalid routes
        console.warn(
          `FlashcardApp: Unknown route '${currentRoute}', falling back to dashboard`
        );
        setCurrentRoute("dashboard");
        return <Dashboard onNavigate={handleNavigation} />;
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
