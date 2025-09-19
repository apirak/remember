# Data Storage and Flow Prompt

This is an AI prompt for implementing data management in a spaced repetition flashcard application. Use this as guidance for creating robust data handling with dual storage strategies.

## Data Architecture Mission

Create a seamless learning experience that works both offline (guest users) and online (authenticated users) with intelligent data synchronization and optimistic updates.

## Essential Data Examples

### Basic Flashcard Structure

```json
{
  "id": "nihao",
  "front": { "icon": "🗣️", "title": "你好", "description": "nǐ hǎo" },
  "back": { "icon": "👋", "title": "Hello", "description": "A greeting used when meeting someone" },
  "learningData": {
    "easinessFactor": 2.5,
    "nextReviewDate": "2025-09-20",
    "totalReviews": 3,
    "isNew": false
  }
}
```

### Session Progress Tracking

```json
{
  "currentSession": {
    "totalCards": 8,
    "reviewedCards": 3,
    "easyCount": 1,
    "hardCount": 1,
    "againCount": 1,
    "isComplete": false
  }
}
```

### User Statistics

```json
{
  "stats": {
    "totalCards": 50,
    "dueCards": 8,
    "masteredCards": 12,
    "reviewsToday": 15
  }
}
```

## Storage Strategy Requirements

### Local Storage (Guest Users)

**Purpose**: Allow immediate app usage without registration

**Implementation Requirements**:

- Use localStorage with specific keys for data persistence
- Store flashcard data with learning progress
- Handle browser storage limitations gracefully
- Provide data export options for account migration

**Storage Keys to Implement**:

- `app-flashcards`: Complete flashcard data with learning progress
- `app-session`: Current review session state
- `app-stats`: Basic performance statistics

### Cloud Storage (Authenticated Users)

**Purpose**: Cross-device synchronization and data backup

**Implementation Requirements**:

- Secure user data isolation
- Efficient querying for due cards
- Optimistic updates with offline support
- Automatic data backup and recovery

## Data Flow Patterns

### Core Application Flow

```text
App Start → Detect User Type → Load Appropriate Storage → Initialize Learning State
```

### Review Session Flow

```text
Start Session → Load Due Cards → Present Card → Rate Quality → 
Update Learning Data → Save Progress → Next Card → Complete Session
```

### Data Synchronization Strategy

**Optimistic Updates**:

- Update UI immediately on user action
- Save changes to storage asynchronously
- Handle failures with graceful error recovery
- Provide visual feedback for sync status

**Offline Support**:

- Cache data locally for offline access
- Queue changes when connection unavailable
- Sync queued changes when online
- Resolve conflicts intelligently

## Guest-to-Authenticated Migration

**Migration Strategy**: Seamlessly transfer guest progress when users create accounts

**Implementation Guidelines**:

- Detect guest data in localStorage on account creation
- Validate and transform local data for cloud storage
- Batch upload to prevent data loss
- Clear local storage after successful migration
- Provide progress feedback during migration

## Error Handling Strategy

**Graceful Degradation**: Ensure app functionality regardless of storage issues

**Error Recovery Patterns**:

- Automatic retry with exponential backoff
- Rollback UI changes on storage failures
- Offline mode fallback when cloud unavailable
- User-friendly error messages with recovery actions

## Performance Considerations

**Efficient Data Management**:

- Lazy load cards not currently needed
- Cache frequently accessed data
- Batch operations to reduce storage calls
- Optimize query patterns for due cards

**Memory Optimization**:

- Clean up unused data structures
- Implement efficient sorting for large datasets
- Use appropriate data structures for different operations

## Implementation Guidelines

**Data Consistency**: Maintain data integrity across storage types

**Privacy & Security**: Implement proper data isolation and validation

**User Experience**: Provide visual feedback for all data operations

**Scalability**: Design for growth in user base and data volume

Use this prompt to guide AI in creating robust data management systems that provide seamless learning experiences across guest and authenticated user modes.
