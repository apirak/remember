// CardSetSelection component - displays available card sets for user selection
// Shows list of card sets with progress, descriptions, and navigation

import React, { useState, useEffect } from 'react';
import EmojiText from '../EmojiSVG';
import { useFlashcard } from '../../contexts/FlashcardContext';
import type { CardSet } from '../../types/flashcard';

// Extended card set with progress for display
interface CardSetWithProgress extends CardSet {
  progress: number; // 0-100 percentage
  dataFile: string; // JSON file containing the card data
}

// Navigation type to match existing patterns
type AppRoute = 'dashboard' | 'review' | 'complete' | 'card-sets' | 'profile';

interface CardSetSelectionProps {
  onNavigate: (route: AppRoute) => void;
}

const CardSetSelection: React.FC<CardSetSelectionProps> = ({ onNavigate }) => {
  // Access FlashcardContext to set the current card set and load progress
  const { setSelectedCardSet, loadAllCardSetProgress, state } = useFlashcard();

  // State for loading card sets from JSON
  const [cardSets, setCardSets] = useState<CardSet[]>([]);

  // State for loading progress data
  const [progressData, setProgressData] = useState<Record<string, number>>({});

  // State for scroll shadow effect
  const [isScrolled, setIsScrolled] = useState(false);

  // Load card sets from JSON file on component mount
  useEffect(() => {
    const loadCardSets = async () => {
      try {
        // Fetch the card set JSON data using the same method as card sets
        const response = await fetch('/data/card_set.json');
        if (!response.ok) {
          throw new Error(
            `Failed to load card sets: ${response.status} ${response.statusText}`
          );
        }
        const jsonData = await response.json();

        // Transform JSON data to match our CardSet interface
        const transformedCardSets: CardSet[] = jsonData.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          cover: item.cover,
          cardCount: item.cardCount,
          progress: 0, // Will be updated with real data
          dataFile: item.dataFile,
        }));

        setCardSets(transformedCardSets);
        console.log(
          'CardSetSelection: Loaded',
          transformedCardSets.length,
          'card sets from JSON'
        );
      } catch (error) {
        console.error('CardSetSelection: Error loading card sets:', error);
        // Fallback to empty array if loading fails
        setCardSets([]);
      }
    };

    loadCardSets();
  }, []);

  // Load progress data for authenticated users
  useEffect(() => {
    const loadProgress = async () => {
      if (!state.isGuest && state.user) {
        try {
          console.log(
            'CardSetSelection: Loading progress data for authenticated user'
          );
          const progress = await loadAllCardSetProgress();
          setProgressData(progress);
          console.log(
            `CardSetSelection: Loaded progress for ${
              Object.keys(progress).length
            } card sets`
          );
        } catch (error) {
          console.error('CardSetSelection: Error loading progress:', error);
          setProgressData({});
        }
      } else {
        console.log('CardSetSelection: Guest mode - using mock progress data');
        // For guests, use mock progress data
        const mockProgress: Record<string, number> = {
          hsk_1_set_1_english: 25,
          chinese_essentials_1: 60,
          ielts_adjective_thai: 0,
        };
        setProgressData(mockProgress);
      }
    };

    loadProgress();
  }, [state.isGuest, state.user, loadAllCardSetProgress]);

  // Merge card sets with progress data
  const cardSetsWithProgress = cardSets.map((cardSet) => ({
    ...cardSet,
    progress: progressData[cardSet.id] || 0,
  }));
  // Handle scroll event to show/hide shadow
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setIsScrolled(target.scrollTop > 0);
  };

  // Handle card set selection
  const handleCardSetSelect = (cardSetWithProgress: CardSetWithProgress) => {
    console.log('CardSetSelection: Card set selected', {
      id: cardSetWithProgress.id,
      name: cardSetWithProgress.name,
      cardCount: cardSetWithProgress.cardCount,
      progress: cardSetWithProgress.progress,
    });

    // Remove the progress property before passing to setSelectedCardSet
    const { progress: _, ...cardSet } = cardSetWithProgress;

    // Set the selected card set in the context
    setSelectedCardSet(cardSet);

    console.log(
      `CardSetSelection: Set selected card set to ${cardSet.name} (${cardSet.dataFile})`
    );

    // Navigate to dashboard using client-side routing (no reload)
    onNavigate('dashboard');
  };

  // Handle back navigation
  const handleBackClick = () => {
    console.log(
      'CardSetSelection: Back button clicked, navigating to dashboard'
    );
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen from-blue-50">
      <div className="h-screen flex flex-col">
        {/* Navigation Header - Sticky */}
        <div
          className={`sticky top-0 z-10 from-blue-50 backdrop-blur-md border-b border-white/20 p-4 pb-2 transition-shadow duration-300 ${
            isScrolled ? 'shadow-md shadow-black/10' : ''
          }`}
        >
          <div className="max-w-md w-full mx-auto">
            <div className="flex items-center justify-between">
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
        </div>

        {/* Card Sets List - Scrollable */}
        <div className="flex-1 overflow-auto" onScroll={handleScroll}>
          <div className="max-w-md w-full mx-auto p-4 pt-6">
            <div className="space-y-4 pb-4">
              {cardSetsWithProgress.map((cardSet) => (
                <div
                  key={cardSet.id}
                  onClick={() => handleCardSetSelect(cardSet)}
                  className="bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-md hover:shadow-xl hover:scale-[101%] transition-all duration-200 cursor-pointer"
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

                  {/* Progress Bar - Only show for authenticated users with progress > 0 */}
                  {!state.isGuest && cardSet.progress > 0 && (
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
                  )}

                  {/* Card Count and Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-rounded text-gray-600">
                      {cardSet.cardCount} cards
                    </span>

                    {/* Only show status for authenticated users with progress > 0 */}
                    {!state.isGuest && cardSet.progress > 0 && (
                      <>
                        {cardSet.progress === 100 ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-rounded rounded-full">
                            Complete
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-rounded rounded-full">
                            In Progress
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state message if no card sets */}
            {cardSets.length === 0 && (
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
    </div>
  );
};

export default CardSetSelection;
