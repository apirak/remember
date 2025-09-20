// CardSetSelection component - displays available card sets for user selection
// Shows list of card sets with progress, descriptions, and navigation

import React from "react";
import EmojiText from "../EmojiSVG";

// Type definitions for card set data structure
interface CardSet {
  id: string;
  name: string;
  description: string;
  cover: string; // emoji
  cardCount: number;
  progress: number; // 0-100 percentage
}

// Navigation type to match existing patterns
type AppRoute = "dashboard" | "review" | "complete" | "card-sets";

interface CardSetSelectionProps {
  onNavigate: (route: AppRoute) => void;
}

// Mock data for initial implementation (Step 2)
const mockCardSets: CardSet[] = [
  {
    id: "chinese_essentials_1",
    name: "Chinese Essentials 1",
    description: "Basic everyday communication",
    cover: "🇨🇳",
    cardCount: 103,
    progress: 45,
  },
  {
    id: "chinese_essentials_2",
    name: "Chinese Essentials 2",
    description: "Intermediate conversations",
    cover: "🏮",
    cardCount: 87,
    progress: 12,
  },
  {
    id: "business_chinese",
    name: "Business Chinese",
    description: "Professional vocabulary",
    cover: "💼",
    cardCount: 156,
    progress: 0,
  },
];

const CardSetSelection: React.FC<CardSetSelectionProps> = ({ onNavigate }) => {
  // Handle card set selection
  const handleCardSetSelect = (cardSet: CardSet) => {
    console.log("CardSetSelection: Card set selected", {
      id: cardSet.id,
      name: cardSet.name,
      cardCount: cardSet.cardCount,
      progress: cardSet.progress,
    });

    // For Step 3: Navigate back to dashboard after selection
    // In Step 4, this will actually load the selected card set data
    console.log(
      `CardSetSelection: Navigating back to dashboard with selected set: ${cardSet.name}`
    );
    onNavigate("dashboard");
  };

  // Handle back navigation
  const handleBackClick = () => {
    console.log(
      "CardSetSelection: Back button clicked, navigating to dashboard"
    );
    onNavigate("dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50">
      <div className="min-h-screen flex flex-col p-4">
        {/* Navigation Header */}
        <div className="max-w-md w-full mx-auto mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleBackClick}
              className="flex items-center px-3 py-2 text-sm font-rounded text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            >
              <span className="mr-2">←</span>
              <span>Back</span>
            </button>

            <h1 className="text-2xl font-child text-gray-700">Card Sets</h1>

            {/* Spacer for centering */}
            <div className="w-16"></div>
          </div>
        </div>

        {/* Card Sets List */}
        <div className="max-w-md w-full mx-auto flex-1">
          <div className="space-y-4">
            {mockCardSets.map((cardSet) => (
              <div
                key={cardSet.id}
                onClick={() => handleCardSetSelect(cardSet)}
                className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-lg hover:shadow-xl hover:scale-[101%] transition-all duration-200 cursor-pointer"
              >
                {/* Card Set Header */}
                <div className="flex items-center mb-3">
                  <div className="text-3xl mr-3">
                    <EmojiText size={48}>{cardSet.cover}</EmojiText>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-child text-gray-700 mb-1">
                      {cardSet.name}
                    </h2>
                    <p className="text-sm font-rounded text-gray-600">
                      {cardSet.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs font-rounded text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{cardSet.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${cardSet.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card Count and Status */}
                <div className="flex justify-between items-center">
                  <span className="text-sm font-rounded text-gray-600">
                    {cardSet.cardCount} cards
                  </span>

                  {cardSet.progress === 0 ? (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-rounded rounded-full">
                      New
                    </span>
                  ) : cardSet.progress === 100 ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-rounded rounded-full">
                      Complete
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-rounded rounded-full">
                      In Progress
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state message if no card sets (future-proofing) */}
          {mockCardSets.length === 0 && (
            <div className="text-center py-12">
              <EmojiText size={64}>📚</EmojiText>
              <h2 className="text-xl font-child text-gray-600 mt-4 mb-2">
                No Card Sets Available
              </h2>
              <p className="text-sm font-rounded text-gray-500">
                Check back later for new content!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardSetSelection;
