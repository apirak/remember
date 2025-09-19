# Cloud Storage Architecture Prompt

This is an AI prompt for implementing flexible cloud database architecture for a multi-user flashcard application. Use this as guidance for creating scalable, secure data storage solutions.

## Storage Architecture Mission

Design a cloud database structure that ensures user data isolation, enables efficient queries, and supports seamless scaling while maintaining optimal performance for spaced repetition learning systems.

## Flexible Database Structure Options

### Option 1: User-Centric Structure (Recommended)

```text
/users/{userId}/
├── profile           # User account and preferences
└── cards/           # User's flashcard collection
    ├── {cardId}     # Individual learning progress
    └── ...
```

### Option 2: Shared Content Structure

```text
/users/{userId}/         # User-specific data
├── profile
└── progress/           # Progress on shared cards
    └── {cardId}

/shared_content/        # Global card library
├── {cardId}
└── ...
```

### Option 3: Hybrid Structure

```text
/users/{userId}/
├── profile
├── custom_cards/      # User-created content
└── learning_data/     # Progress tracking
    └── {cardId}

/card_library/         # Curated content
└── {category}/
    └── {cardId}
```

## Essential Document Schemas

### User Profile Schema

```json
{
  "userId": "user123",
  "profile": {
    "email": "user@example.com",
    "displayName": "Learning User",
    "createdAt": "2025-09-18T00:00:00Z",
    "preferences": {
      "theme": "light",
      "language": "en",
      "dailyGoal": 20,
      "notifications": true
    }
  }
}
```

### Flashcard Progress Schema

```json
{
  "cardId": "nihao001",
  "content": {
    "front": { "icon": "🗣️", "title": "你好", "description": "nǐ hǎo" },
    "back": {
      "icon": "👋",
      "title": "Hello",
      "description": "A friendly greeting"
    }
  },
  "learning": {
    "easinessFactor": 2.5,
    "repetitions": 3,
    "interval": 15,
    "nextReviewDate": "2025-10-03T00:00:00Z",
    "totalReviews": 8,
    "isNew": false
  },
  "metadata": {
    "createdAt": "2025-09-01T00:00:00Z",
    "updatedAt": "2025-09-18T00:00:00Z",
    "category": "greetings"
  }
}
```

### Session Statistics Schema

```json
{
  "sessionStats": {
    "date": "2025-09-18",
    "cardsReviewed": 15,
    "correctAnswers": 12,
    "averageResponseTime": 3.2,
    "sessionDuration": 450
  }
}
```

## Cloud Database Implementation Guidelines

### Core Query Patterns

**Due Cards Query**: Retrieve cards scheduled for review today

**User Data Isolation**: Ensure each user can only access their own data

**Efficient Indexing**: Create database indexes for common query patterns

**Batch Operations**: Update multiple cards efficiently in single transactions

### Security Requirements

**User Data Isolation**: Implement strict access controls

- Users can only read/write their own data
- Validate user authentication on all operations
- Prevent cross-user data access
- Log security events for monitoring

**Data Validation**: Ensure data integrity

- Validate data types and required fields
- Sanitize user inputs
- Implement rate limiting
- Check data size limits

### Performance Optimization Strategies

**Efficient Queries**:

- Index fields used in common queries (due date, user ID)
- Limit query results to prevent large data transfers
- Use pagination for large datasets
- Cache frequently accessed data

**Connection Management**:

- Monitor database connection status
- Implement connection pooling
- Handle connection failures gracefully
- Provide offline fallback capabilities

### Data Migration Patterns

**Schema Evolution**: Handle database structure changes

- Version database schema
- Implement backward compatibility
- Provide data transformation scripts
- Test migrations thoroughly

**Data Export/Import**: Support user data portability

- Export user data in standard formats
- Validate imported data integrity
- Handle large dataset imports efficiently
- Provide import progress feedback

## Implementation Flexibility

**Database Technology Options**:

- Cloud Firestore (Google)
- MongoDB Atlas
- PostgreSQL with RLS
- DynamoDB (AWS)
- Supabase

**Authentication Integration**:

- Firebase Auth
- Auth0
- AWS Cognito
- Custom JWT implementation

**Storage Optimization**:

- Separate frequently accessed from archival data
- Implement data compression where appropriate
- Use appropriate data types for storage efficiency
- Archive old session data periodically

Use this prompt to guide AI in creating scalable, secure cloud storage solutions that can adapt to different database technologies while maintaining user data isolation and optimal performance.
const getUserCards = async (userId: string): Promise<Flashcard[]> => {
const cardsRef = collection(firestore, 'users', userId, 'cards');
const snapshot = await getDocs(cardsRef);

return snapshot.docs.map(doc => ({
id: doc.id,
...doc.data(),
// Convert Timestamps to Dates
Use this prompt to guide AI in creating scalable, secure cloud storage solutions that can adapt to different database technologies while maintaining user data isolation and optimal performance.
