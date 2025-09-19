# Spaced Repetition Learning Algorithm Prompt

This is an AI prompt for implementing intelligent spaced repetition systems that optimize learning efficiency through adaptive scheduling. Use this as guidance for creating effective learning algorithms.

## Learning Algorithm Mission

Create an adaptive learning system that intelligently schedules flashcard reviews based on user performance, maximizing long-term retention while minimizing study time through scientific spaced repetition principles.

## Core Learning Concepts

### Spaced Repetition Principle

**Concept**: Review content at increasing intervals based on how well you know it

**Outcome**: Cards you know well appear less frequently, difficult cards appear more often

**Benefits**: Optimizes time spent studying, improves long-term retention, prevents forgetting

### Quality Rating System (Required)

**4-Button Rating Scale**:

```json
{
  "Ask Me Again": 0, // Complete failure - show again immediately
  "Hard": 2, // Difficult recall - shorter next interval
  "Got It": 4, // Correct with effort - normal interval
  "I Know": 5 // Easy recall - longer next interval
}
```

**Rating Guidelines**:

- **Ask Me Again**: You had no idea or completely wrong answer
- **Hard**: You got it wrong but remembered quickly when shown the answer
- **Got It**: You got it right but had to think about it
- **I Know**: You knew it instantly without any hesitation

### Learning Progress Tracking

**Essential Metrics to Track**:

```json
{
  "learningData": {
    "difficulty": 2.5, // How hard this card is (1.3-2.5)
    "consecutiveCorrect": 3, // Streak of correct answers
    "daysTillNextReview": 15, // When to show this card again
    "totalAttempts": 8 // How many times reviewed
  }
}
```

## Algorithm Implementation Guidelines

### Core Algorithm Concepts

**Interval Scheduling**: Determine when to show each card next

- **New cards**: Show today, then tomorrow if correct
- **Learning cards**: Use short intervals (1-6 days)
- **Mature cards**: Use exponentially increasing intervals
- **Failed cards**: Reset to short intervals and show again soon

**Difficulty Adjustment**: Adapt to user performance

- **Easy cards**: Increase intervals faster, reduce frequency
- **Hard cards**: Keep intervals shorter, increase frequency
- **Failed cards**: Reset progress and review more often

**Performance Outcomes**: What the algorithm should achieve

- Users spend more time on difficult content
- Well-known content appears less frequently
- Overall study time is optimized for retention
- Learning progress is measurable and visible

### Essential Learning Metrics

**Card-Level Tracking**:

```json
{
  "cardMetrics": {
    "isNew": false,
    "isMastered": true,
    "isDifficult": false,
    "daysUntilNextReview": 21,
    "timesReviewed": 12,
    "successRate": 0.85
  }
}
```

**Session-Level Tracking**:

```json
{
  "sessionMetrics": {
    "cardsReviewed": 15,
    "uniqueCardsCompleted": 12,
    "easyAnswers": 8,
    "hardAnswers": 3,
    "againAnswers": 1,
    "sessionDuration": 420
  }
}
```

**User-Level Statistics**:

```json
{
  "userStats": {
    "totalCards": 150,
    "dueToday": 23,
    "masteredCards": 67,
    "difficultCards": 8,
    "reviewsCompleted": 1250,
    "averageAccuracy": 0.87,
    "studyStreak": 15
  }
}
```

### Algorithm Behavior Guidelines

**Immediate Retry Logic**:

- "Again" ratings trigger immediate re-review in same session
- Failed cards don't count toward session completion
- Multiple failures increase the card's difficulty rating

**Graduation Logic**:

- Cards "graduate" from learning to mature status
- Mature cards have longer intervals between reviews
- Graduation criteria should be configurable

**Priority Scheduling**:

- Overdue cards appear first in review sessions
- Harder cards get priority within due cards
- New cards are mixed with reviews for engagement

## Implementation Flexibility

**Algorithm Variations**: Allow for different spaced repetition approaches

- **SM-2 Algorithm**: Classic SuperMemo approach
- **FSRS Algorithm**: Modern free spaced repetition scheduler
- **Custom Algorithm**: Tailored to specific learning needs
- **Hybrid Approach**: Combine multiple algorithms
  Use this prompt to guide AI in creating intelligent learning systems that adapt to user performance and optimize long-term knowledge retention through scientifically-backed spaced repetition principles.
