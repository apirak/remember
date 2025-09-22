# Remember Project Information

## Project Structure

- Child-friendly flashcard app: Astro 5.x + React 19 + Firebase + TypeScript
- PNPM package manager (NOT npm)
- Vitest + React Testing Library for testing
- TailwindCSS + Framer Motion for styling/animations

## Main User Flow

Start at Dashboard

```
Card Set Selection → Dashboard → Review Session → Completion → Dashboard
```

**Components**: `CardSetSelection.tsx` → `Dashboard.tsx` → `Review.tsx` → `Completion.tsx`

## Data Storage Patterns

### Guest Mode (Session Storage)

- **What**: Card progress, current session, selected card set
- **Where**: `sessionStorage` via `cardSetPersistence.ts`
- **When**: Immediate on state changes, lost on browser close

### Firebase (Firestore)

- **What**: All user cards, progress, SM-2 parameters, cross-device sync
- **Where**: `services/flashcardService.ts` + `utils/firestore.ts`
- **When**: On authentication, optimistic updates with rollback

### Local Storage

- **What**: Last selected card set only
- **Where**: `localStorage` via `cardSetPersistence.ts`
- **When**: Card set changes (persists across sessions)

## Key Commands

**Always use `pnpm` not `npm`**

- `pnpm run dev` - Development server
- `pnpm run test` - Tests (watch mode)
- `pnpm run test:run` - Tests (single run)
- `pnpm run build` - Production build
- `pnpm run test:no-watch` - For AI to Run tests without watch mode

* For AI to run tests without watch mode, add `--no-watch`

## Architecture

### Core Files

- `src/contexts/FlashcardContext.tsx` - Main state management (React Context + useReducer)
- `src/services/flashcardService.ts` - Firebase operations
- `src/utils/sm2.ts` - Spaced repetition algorithm
- `src/reducers/flashcardReducer.ts` - State transitions

### State Flow

1. User action → Context dispatch
2. Optimistic UI update
3. Firebase sync (if authenticated)
4. Error handling with rollback

## Code Standards

- **Keep simple** - Readable over clever
- **Error handling** - Always implement with user feedback
- **Edge cases** - Handle empty states, network failures
- **Small steps** - Make testable incremental changes
- **Preserve code** - Don't remove comments/code unless asked
- **Clear comments** - Explain logic in code

## Testing

- Vitest with jsdom environment
- Tests in `src/test/`, `tests/`, or co-located
- Use `@testing-library/react` for components
- Mock Firebase in tests

## Key Dependencies

- astro: ^5.13.7, react: ^19.1.1, firebase: ^12.2.1
- vitest: ^3.2.4, framer-motion: ^12.23.13
- @testing-library/react: ^16.3.0
