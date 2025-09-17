# SM-2 Spaced Repetition Algorithm

This implementation of the SuperMemo-2 (SM-2) algorithm optimizes flashcard review scheduling for efficient learning and long-term retention.

## Overview

The SM-2 algorithm, developed by Piotr Wozniak, is a spaced repetition system that determines optimal intervals between flashcard reviews based on the learner's performance. Cards that are easy to remember are scheduled for review after longer intervals, while difficult cards are reviewed more frequently.

## Key Components

### Quality Ratings

The algorithm uses a 0-5 quality scale mapped to user-friendly buttons:

- **0 (AGAIN)** - "Ask Me Again" - Complete blackout, immediate retry needed
- **2 (HARD)** - "Hard" - Incorrect with easy recall of correct answer
- **4 (GOOD)** - "Got It" - Correct response with some hesitation
- **5 (EASY)** - "I Know" - Perfect, effortless response

### SM-2 Parameters

Each flashcard maintains these parameters:

```typescript
interface SM2Parameters {
  easinessFactor: number; // 1.3-2.5, affects interval growth
  repetitions: number; // Consecutive correct responses
  interval: number; // Days until next review
  nextReviewDate: Date; // Scheduled review date
  lastReviewDate: Date; // Last review date
  totalReviews: number; // Total review count
  correctStreak: number; // Current correct streak
  averageQuality: number; // Running average quality
}
```

## Algorithm Logic

### Interval Calculation

1. **First review**: 1 day
2. **Second review**: 6 days
3. **Subsequent reviews**: Previous interval × easiness factor

### Easiness Factor Updates

The easiness factor adjusts based on performance:

- **Formula**: `EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`
- **Range**: 1.3 to 2.5
- **Good performance** (q≥4): Increases EF (longer intervals)
- **Poor performance** (q<3): Decreases EF (shorter intervals)

### Failure Handling

When quality < 3 (incorrect answer):

- Reset repetitions to 0
- Set interval to 1 day
- Reset correct streak
- Mark for immediate retry in current session

## Implementation Features

### Core Functions

#### `calculateSM2(params, quality, reviewDate)`

Updates SM-2 parameters based on review performance.

#### `isCardDue(nextReviewDate, currentDate)`

Checks if a card is due for review.

#### `getDueCards(cards, currentDate)`

Filters cards that need review.

#### `sortCardsByPriority(cards, currentDate)`

Sorts cards by review priority (overdue first, then by difficulty).

#### `calculateReviewStats(cards, currentDate)`

Generates comprehensive statistics about card collection.

### Advanced Features

#### Statistics Tracking

- Total and due card counts
- Overdue card identification
- Mastery progress (cards with repetitions ≥ 3)
- Difficulty assessment (cards with low easiness factor)
- Performance metrics (average quality, total reviews)

#### Date Normalization

All dates are normalized to start-of-day to ensure consistent scheduling regardless of review time.

#### Priority Sorting

Cards are prioritized by:

1. Days overdue (most overdue first)
2. Difficulty (lower easiness factor = higher priority)

## Usage Examples

### Basic Card Review

```typescript
import {
  calculateSM2,
  initializeSM2Params,
  QUALITY_RATINGS,
} from "@/utils/sm2";

// Create new card
let cardParams = initializeSM2Params();

// User reviews and rates as "Got It"
const result = calculateSM2(cardParams, QUALITY_RATINGS.GOOD);

// Update card with new parameters
cardParams = result;

console.log(`Next review in ${result.interval} days`);
console.log(`Review scheduled for: ${result.nextReviewDate.toDateString()}`);
```

### Session Management

```typescript
import { getDueCards, sortCardsByPriority } from "@/utils/sm2";

// Get cards due for review today
const dueCards = getDueCards(allCards);

// Sort by priority (most important first)
const prioritizedCards = sortCardsByPriority(dueCards);

// Present cards in optimal order
prioritizedCards.forEach((card) => {
  // Present card for review
});
```

### Progress Tracking

```typescript
import { calculateReviewStats, formatReviewStats } from "@/utils/sm2";

// Calculate comprehensive statistics
const stats = calculateReviewStats(userCards);

// Format for display
const displayStats = formatReviewStats(stats);

console.log(`Progress: ${displayStats.masteredCards} mastered`);
console.log(`Due today: ${displayStats.dueCards} cards`);
```

## Button Mapping for Flashcard App

### UI Flow

1. **Show front of card** with word and pinyin
2. **"Show Me" button** reveals back with translation and image
3. **"I Know" button** (shortcut) = Quality 5 (EASY)
4. **Rating buttons** after revealing answer:
   - "Ask Me Again" = Quality 0 (AGAIN)
   - "Hard" = Quality 2 (HARD)
   - "Got It" = Quality 4 (GOOD)

### Queue Behavior

- **"I Know" and successful ratings**: Remove from session queue
- **"Ask Me Again"**: Add back to end of current session queue
- **Session completion**: When no cards remain in queue

## Performance Characteristics

### Memory Efficiency

- O(1) space per card for SM-2 parameters
- Efficient date calculations using date-fns

### Time Complexity

- O(1) for single card updates
- O(n log n) for sorting cards by priority
- O(n) for filtering due cards

### Accuracy

- Follows original SM-2 specification precisely
- Handles edge cases (bounds checking, date normalization)
- Comprehensive test coverage with 13 test cases

## Testing

The implementation includes a comprehensive test suite covering:

- Basic algorithm operations
- Edge cases and bounds
- Date handling and normalization
- Statistics calculation
- Integration scenarios

Run tests with:

```typescript
import { runSM2Tests } from "@/utils/sm2Test";
runSM2Tests(); // Returns true if all tests pass
```

## Integration with Firebase

The SM-2 parameters integrate seamlessly with Firestore:

```typescript
// Save card with SM-2 data
await saveFlashcard({
  id: cardId,
  front: { title: "你好", description: "nǐ hǎo" },
  back: { title: "Hello", icon: "👋" },
  sm2: cardParams, // SM-2 parameters
  updatedAt: new Date(),
});

// Update progress after review
const result = calculateSM2(card.sm2, quality);
await updateFlashcardProgress(cardId, {
  sm2: result,
  lastReviewedAt: new Date(),
});
```

## Algorithm Benefits

1. **Optimized Learning**: Reviews cards just before you'd forget them
2. **Efficient Time Use**: Focus on difficult cards, less time on easy ones
3. **Long-term Retention**: Gradually increases intervals for mastered content
4. **Adaptive**: Adjusts to individual learning patterns
5. **Proven**: Decades of research and real-world usage

## Customization Options

The implementation allows for easy customization:

- Adjust quality rating thresholds
- Modify interval calculation formulas
- Change easiness factor bounds
- Add custom statistics tracking

This SM-2 implementation provides a solid foundation for effective spaced repetition learning in the flashcard application.
