// SM-2 Algorithm Test Suite
// Comprehensive tests to verify the SM-2 implementation

import {
  calculateSM2,
  isCardDue,
  getDueCards,
  sortCardsByPriority,
  initializeSM2Params,
  calculateReviewStats,
  QUALITY_RATINGS,
  type SM2Parameters,
  type QualityRating
} from './sm2';
import { addDays, subDays } from 'date-fns';

// Test interfaces
interface TestCard {
  id: string;
  sm2: SM2Parameters;
}

// Test data generator
const createTestCard = (id: string, sm2Overrides: Partial<SM2Parameters> = {}): TestCard => ({
  id,
  sm2: { ...initializeSM2Params(), ...sm2Overrides }
});

// Test cases for SM-2 algorithm
export const runSM2Tests = (): boolean => {
  console.log('🧪 Running SM-2 Algorithm Tests...');
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Helper function to run a test
  const test = (name: string, testFn: () => boolean): void => {
    totalTests++;
    try {
      const result = testFn();
      if (result) {
        console.log(`✅ ${name}`);
        passedTests++;
      } else {
        console.log(`❌ ${name} - Test failed`);
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error}`);
    }
  };
  
  // Test 1: Initial SM-2 parameters
  test('Initial SM-2 parameters are correct', () => {
    const params = initializeSM2Params();
    return (
      params.easinessFactor === 2.5 &&
      params.repetitions === 0 &&
      params.interval === 1 &&
      params.totalReviews === 0 &&
      params.correctStreak === 0 &&
      params.averageQuality === 0
    );
  });
  
  // Test 2: First correct review (quality = 4)
  test('First correct review updates parameters correctly', () => {
    const initial = initializeSM2Params();
    const result = calculateSM2(initial, QUALITY_RATINGS.GOOD);
    
    return (
      result.repetitions === 1 &&
      result.interval === 1 &&
      result.totalReviews === 1 &&
      result.correctStreak === 1 &&
      !result.shouldRepeatToday &&
      result.easinessFactor > initial.easinessFactor // Should increase slightly
    );
  });
  
  // Test 3: Second correct review
  test('Second correct review extends interval', () => {
    const initial = initializeSM2Params();
    const firstReview = calculateSM2(initial, QUALITY_RATINGS.GOOD);
    const secondReview = calculateSM2(firstReview, QUALITY_RATINGS.GOOD);
    
    return (
      secondReview.repetitions === 2 &&
      secondReview.interval === 6 &&
      secondReview.correctStreak === 2 &&
      !secondReview.shouldRepeatToday
    );
  });
  
  // Test 4: Third correct review uses easiness factor
  test('Third correct review uses easiness factor calculation', () => {
    const initial = initializeSM2Params();
    const firstReview = calculateSM2(initial, QUALITY_RATINGS.GOOD);
    const secondReview = calculateSM2(firstReview, QUALITY_RATINGS.GOOD);
    const thirdReview = calculateSM2(secondReview, QUALITY_RATINGS.GOOD);
    
    return (
      thirdReview.repetitions === 3 &&
      thirdReview.interval > 6 && // Should be roughly 6 * easiness factor
      thirdReview.correctStreak === 3 &&
      !thirdReview.shouldRepeatToday
    );
  });
  
  // Test 5: Incorrect answer resets repetitions
  test('Incorrect answer resets repetitions and sets repeat flag', () => {
    const initial = initializeSM2Params();
    const firstReview = calculateSM2(initial, QUALITY_RATINGS.GOOD);
    const secondReview = calculateSM2(firstReview, QUALITY_RATINGS.GOOD);
    const failedReview = calculateSM2(secondReview, QUALITY_RATINGS.AGAIN);
    
    return (
      failedReview.repetitions === 0 &&
      failedReview.interval === 1 &&
      failedReview.correctStreak === 0 &&
      failedReview.shouldRepeatToday &&
      failedReview.easinessFactor < secondReview.easinessFactor // Should decrease
    );
  });
  
  // Test 6: "I Know" button gives highest quality
  test('"I Know" button gives optimal scheduling', () => {
    const initial = initializeSM2Params();
    const easyReview = calculateSM2(initial, QUALITY_RATINGS.EASY);
    const goodReview = calculateSM2(initial, QUALITY_RATINGS.GOOD);
    
    return (
      easyReview.easinessFactor > goodReview.easinessFactor &&
      easyReview.averageQuality > goodReview.averageQuality
    );
  });
  
  // Test 7: Easiness factor bounds
  test('Easiness factor stays within bounds', () => {
    let params = initializeSM2Params();
    
    // Try to push easiness factor to extremes
    for (let i = 0; i < 10; i++) {
      params = calculateSM2(params, QUALITY_RATINGS.AGAIN); // Should decrease EF
    }
    const minEF = params.easinessFactor;
    
    params = initializeSM2Params();
    for (let i = 0; i < 10; i++) {
      params = calculateSM2(params, QUALITY_RATINGS.EASY); // Should increase EF
    }
    const maxEF = params.easinessFactor;
    
    return minEF >= 1.3 && maxEF <= 2.5;
  });
  
  // Test 8: Card due checking
  test('Card due checking works correctly', () => {
    const today = new Date();
    const yesterday = subDays(today, 1);
    const tomorrow = addDays(today, 1);
    
    return (
      isCardDue(yesterday, today) === true &&
      isCardDue(today, today) === true &&
      isCardDue(tomorrow, today) === false
    );
  });
  
  // Test 9: Due cards filtering
  test('Due cards filtering works correctly', () => {
    const today = new Date();
    const cards: TestCard[] = [
      createTestCard('1', { nextReviewDate: subDays(today, 1) }), // Overdue
      createTestCard('2', { nextReviewDate: today }), // Due today
      createTestCard('3', { nextReviewDate: addDays(today, 1) }), // Future
      createTestCard('4', { nextReviewDate: subDays(today, 2) }) // Very overdue
    ];
    
    const dueCards = getDueCards(cards, today);
    return dueCards.length === 3; // Cards 1, 2, and 4
  });
  
  // Test 10: Card priority sorting
  test('Card priority sorting works correctly', () => {
    const today = new Date();
    const cards: TestCard[] = [
      createTestCard('future', { nextReviewDate: addDays(today, 1), easinessFactor: 2.0 }),
      createTestCard('overdue1', { nextReviewDate: subDays(today, 1), easinessFactor: 2.0 }),
      createTestCard('overdue2', { nextReviewDate: subDays(today, 1), easinessFactor: 1.5 }), // Harder card
      createTestCard('today', { nextReviewDate: today, easinessFactor: 2.5 })
    ];
    
    const sorted = sortCardsByPriority(cards, today);
    
    // Should be: overdue2 (harder), overdue1, today, future
    return (
      sorted[0].id === 'overdue2' &&
      sorted[1].id === 'overdue1' &&
      sorted[2].id === 'today' &&
      sorted[3].id === 'future'
    );
  });
  
  // Test 11: Review statistics calculation
  test('Review statistics calculation is accurate', () => {
    const today = new Date();
    const cards: TestCard[] = [
      createTestCard('1', { 
        nextReviewDate: subDays(today, 1), 
        repetitions: 4, 
        easinessFactor: 2.2,
        totalReviews: 5
      }),
      createTestCard('2', { 
        nextReviewDate: today, 
        repetitions: 1, 
        easinessFactor: 1.7,
        totalReviews: 3
      }),
      createTestCard('3', { 
        nextReviewDate: addDays(today, 1), 
        repetitions: 0, 
        easinessFactor: 2.5,
        totalReviews: 1
      })
    ];
    
    const stats = calculateReviewStats(cards, today);
    
    return (
      stats.totalCards === 3 &&
      stats.dueCards === 2 && // Cards 1 and 2
      stats.masteredCards === 1 && // Card 1 (repetitions >= 3 && EF >= 2.0)
      stats.difficultCards === 1 && // Card 2 (EF < 1.8)
      stats.totalReviews === 9 // 5 + 3 + 1
    );
  });
  
  // Test 12: Average quality tracking
  test('Average quality tracking works correctly', () => {
    let params = initializeSM2Params();
    
    // First review: quality 4
    params = calculateSM2(params, QUALITY_RATINGS.GOOD);
    const firstAvg = params.averageQuality;
    
    // Second review: quality 2
    params = calculateSM2(params, QUALITY_RATINGS.HARD);
    const secondAvg = params.averageQuality;
    
    return (
      firstAvg === 4 &&
      secondAvg === 3 && // (4 + 2) / 2 = 3
      params.totalReviews === 2
    );
  });
  
  // Test 13: Date normalization
  test('Review dates are normalized to start of day', () => {
    const morning = new Date(2024, 0, 1, 9, 30); // 9:30 AM
    const evening = new Date(2024, 0, 1, 21, 45); // 9:45 PM
    
    const morningParams = initializeSM2Params(morning);
    const eveningParams = initializeSM2Params(evening);
    
    return (
      morningParams.nextReviewDate.getHours() === 0 &&
      eveningParams.nextReviewDate.getHours() === 0 &&
      morningParams.nextReviewDate.getTime() === eveningParams.nextReviewDate.getTime()
    );
  });
  
  // Summary
  console.log(`\n📊 SM-2 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All SM-2 tests passed! Algorithm is working correctly.');
    return true;
  } else {
    console.log('⚠️  Some SM-2 tests failed. Please review the implementation.');
    return false;
  }
};

// Example usage demonstration
export const demonstrateSM2Usage = (): void => {
  console.log('\n📚 SM-2 Algorithm Usage Demonstration:');
  
  // Create a new flashcard
  let cardParams = initializeSM2Params();
  console.log('New card created:', {
    easinessFactor: cardParams.easinessFactor,
    interval: cardParams.interval,
    nextReview: cardParams.nextReviewDate.toDateString()
  });
  
  // Simulate a learning session
  const reviews: { quality: QualityRating; label: string }[] = [
    { quality: QUALITY_RATINGS.GOOD, label: 'Got It' },
    { quality: QUALITY_RATINGS.GOOD, label: 'Got It' },
    { quality: QUALITY_RATINGS.EASY, label: 'I Know' },
    { quality: QUALITY_RATINGS.AGAIN, label: 'Ask Me Again' },
    { quality: QUALITY_RATINGS.HARD, label: 'Hard' },
    { quality: QUALITY_RATINGS.GOOD, label: 'Got It' }
  ];
  
  reviews.forEach((review, index) => {
    const result = calculateSM2(cardParams, review.quality);
    cardParams = result; // Update parameters with result
    console.log(`Review ${index + 1} (${review.label}):`, {
      repetitions: result.repetitions,
      interval: result.interval,
      easinessFactor: result.easinessFactor.toFixed(2),
      nextReview: result.nextReviewDate.toDateString(),
      correctStreak: result.correctStreak,
      shouldRepeatToday: result.shouldRepeatToday
    });
  });
  
  console.log('\nFinal card statistics:', {
    totalReviews: cardParams.totalReviews,
    averageQuality: cardParams.averageQuality.toFixed(1),
    easinessFactor: cardParams.easinessFactor.toFixed(2)
  });
};

// Export test utilities
export default {
  runSM2Tests,
  demonstrateSM2Usage,
  createTestCard
};