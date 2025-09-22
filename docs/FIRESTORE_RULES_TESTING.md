# Firestore Rules Testing - Card Set Progress

## Added Rules for Card Set Progress

### Collection Structure

```text
/users/{userId}/cardSetProgress/{cardSetId}
```

### Security Rules

- **Read**: Authenticated users can only read their own progress data
- **Write**: Authenticated users can only write their own progress data with validation

### Data Validation

The validation function `validateCardSetProgress()` ensures:

1. **Required fields**: `cardSetId`, `totalCards`, `reviewedCards`, `progressPercentage`, `updatedAt`
2. **Field types**:
   - `cardSetId`: string
   - `totalCards`: number >= 0
   - `reviewedCards`: number >= 0
   - `progressPercentage`: number (0-100)
3. **Data integrity**:
   - `reviewedCards <= totalCards`
   - `progressPercentage` between 0-100

### Example Valid Document

```json
{
  "cardSetId": "chinese_essentials_1",
  "totalCards": 50,
  "reviewedCards": 15,
  "progressPercentage": 30,
  "lastReviewDate": "2025-09-22T...",
  "createdAt": "2025-09-20T...",
  "updatedAt": "2025-09-22T..."
}
```

### Test Cases

✅ **Should Allow**: Authenticated user updating their own progress with valid data  
❌ **Should Deny**: Unauthenticated access  
❌ **Should Deny**: User accessing another user's progress  
❌ **Should Deny**: Missing required fields  
❌ **Should Deny**: Invalid data types  
❌ **Should Deny**: `reviewedCards > totalCards`  
❌ **Should Deny**: `progressPercentage > 100`

### Firebase Rules Testing Commands

```bash
# If Firebase CLI is available:
firebase emulators:start --only firestore
firebase firestore:rules:test --test-path=tests/firestore.rules.test.js
```
