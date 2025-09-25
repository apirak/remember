# Manual Testing Guide for Firestore Batch Optimization

## 📋 Test Scenarios

### 🎯 Scenario 1: Normal Review Session (Main Success Path)

**Setup:**
1. Start dev server: `pnpm run dev`
2. Go to http://localhost:4322
3. Sign in with your Firebase account
4. Select any card set with multiple cards

**Test Steps:**
1. Click "Start Review" 
2. Review 3-5 cards with different ratings (Again, Hard, Good, Easy)
3. Complete the entire session
4. Watch browser console for logs

**Expected Results:**
- ✅ Console should show: "Card rated: [cardId] quality: [rating] batch save will occur at session completion"
- ✅ NO individual Firestore writes during review (no "Updated progress for card X in Firestore" messages)
- ✅ At session end: "Session completed: Batch saving X progress updates"
- ✅ Final success: "✅ Batch progress save completed successfully"

**What to Monitor:**
```
[Expected Console Output Pattern]

During Review:
> Card rated: card-001 quality: 4 batch save will occur at session completion
> Card rated: card-002 quality: 3 batch save will occur at session completion
> Card rated: card-003 quality: 5 batch save will occur at session completion

At Session Completion:
> Session completed: Batch saving 3 progress updates
> Batch saving progress for 3 cards in card set: chinese_essentials_1
> 3 flashcards saved in batch
> ✅ Batch progress save completed successfully
```

---

### 🔄 Scenario 2: Network Interruption Test

**Setup:**
1. Start review session as above
2. Open Chrome DevTools → Network tab
3. Rate 2-3 cards
4. Before completing session: Set network to "Offline" 
5. Complete the session

**Expected Results:**
- ✅ Batch save should fail gracefully
- ✅ Error should be handled: "❌ Batch progress save failed: [network error]"
- ✅ App should remain functional (no crash)

---

### 🚪 Scenario 3: Navigation Away Test 

**Setup:**
1. Start review session 
2. Rate 1-2 cards (don't complete session)
3. Navigate away (click back button or browser back)

**Expected Results:**
- 🔄 This will be implemented in Step 4 (navigation-away save handling)
- Currently: Progress will be lost (expected behavior until Step 4)

---

### 📊 Scenario 4: Performance Comparison

**Before Optimization (Reference):**
- Each card rating = 1 Firestore read + 1 Firestore write
- 5 cards = 10 operations

**After Optimization (Current):**
- Card set load = 1 Firestore read  
- Entire session = 1 Firestore batch write
- 5 cards = 2 operations (83% reduction!)

**How to Verify:**
1. Open Chrome DevTools → Network tab
2. Filter by "firestore" or look for Firebase requests
3. Count network requests during review session
4. Should see significantly fewer requests

---

## 🐛 Debugging Tips

### Console Commands for Debugging:

```javascript
// Check current session state
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).currentFiber.memoizedProps.children.props.value.state.currentSession

// Check pending progress
window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.get(1).currentFiber.memoizedProps.children.props.value.state.currentSession?.pendingProgress

// Manually trigger batch save (for debugging)
// Note: Only works if you expose FlashcardService globally
FlashcardService.saveProgressBatch(new Map([["test", {easinessFactor: 2.5}]]), "test_set")
```

### Expected Error Messages:

**Good Errors (Expected):**
- "No progress updates to save in batch" (when session has no progress)
- "User must be authenticated to save progress batch" (when not signed in)

**Bad Errors (Need Investigation):**
- JavaScript errors in console during batch save
- "Cannot read properties of undefined" errors
- Network errors that aren't handled gracefully

---

## 🧪 Firebase Console Verification

1. Go to Firebase Console → Firestore
2. Navigate to: `users/{userId}/cardSets/{cardSetId}/cards`
3. During review: Should NOT see realtime updates to individual cards
4. After session completion: Should see batch update of all reviewed cards
5. Check `updatedAt` timestamps - should be identical or very close for all cards in the session

---

## ⚡ Performance Metrics

### Before vs After Optimization:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|  
| Firestore Operations (5 cards) | 10 | 2 | 80% reduction |
| Network Requests | 10+ | 2 | 80% reduction |
| UI Responsiveness | Can lag on slow networks | Smooth (optimistic updates) | Better UX |
| Data Loss Risk | Low (immediate save) | Low (session storage fallback planned) | Same |

### What to Measure:
- Time to complete review session
- Network request count  
- Firestore read/write quota usage
- User experience smoothness

---

## 🔍 Next Steps After Manual Testing:

1. **If tests pass**: Proceed to Step 4 (Navigation-away save handling)
2. **If issues found**: Debug and fix before proceeding
3. **Performance metrics**: Document actual improvement numbers
