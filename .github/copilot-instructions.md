# Remember Project Information

## Project Structure

- Full-stack flashcard learning application built with Astro 5.x + React 19
- Firebase backend with Authentication and Firestore database
- React frontend with TypeScript in `src/components/`
- Astro for static site generation with React integration
- Vitest for testing with React Testing Library
- TailwindCSS for styling
- Framer Motion for animations
- PNPM as package manager (NOT npm)

## Key Dependencies

- "astro": "^5.13.7"
- "react": "^19.1.1"
- "react-dom": "^19.1.1"
- "react-router-dom": "^7.9.1"
- "firebase": "^12.2.1"
- "framer-motion": "^12.23.13"
- "typescript": "^5.9.2"
- "date-fns": "^4.1.0"
- "twemoji": "^14.0.2"
- "@astrojs/react": "^4.3.1"
- "@astrojs/tailwind": "^6.0.2"
- "vitest": "^3.2.4"
- "@testing-library/react": "^16.3.0"
- "@testing-library/jest-dom": "^6.8.0"
- "@testing-library/user-event": "^14.6.1"

## Project Purpose

Remember is a child-friendly flashcard learning application that:

- Implements spaced repetition using the SM-2 algorithm for optimal learning
- Supports both guest mode (session storage) and authenticated users (Firebase)
- Provides smooth SPA experience with React Router
- Features game-like UI with animations for engaging child experience
- Manages flashcard sets with progress tracking and statistics
- Handles multiple card sets (Chinese language learning focus)

## Environment Setup

- Environment variables should be set in a `.env` file for Firebase configuration
- Firebase project configuration required for authentication and Firestore
- No server-side environment needed (static site deployment)

## Commands to Run

**IMPORTANT: Always use `pnpm` instead of `npm`**

- Development server: `pnpm run dev`
- Build: `pnpm run build`
- Preview build: `pnpm run preview`
- Type checking: `pnpm run astro check`
- Test (watch mode): `pnpm run test`
- Test (run once): `pnpm run test:run`
- Test with UI: `pnpm run test:ui`
- Test with coverage: `pnpm run test:coverage`

### Testing Commands

- Run specific test file: `pnpm run test [file-pattern]`
- Run specific test by name: `pnpm run test -t "test name"`
- Run tests in specific directory: `pnpm run test src/components/`

Example:

```bash
pnpm run test src/utils/sm2.test.ts
pnpm run test -t "should calculate next review date"
```

## Testing

- Uses Vitest testing framework with jsdom environment
- Tests organized in `src/test/`, `tests/`, and co-located with components
- Uses `.test.ts` or `.spec.ts` naming convention
- Testing libraries:
  - `vitest` for test execution
  - `@testing-library/react` for React component testing
  - `@testing-library/jest-dom` for DOM assertions
  - `@testing-library/user-event` for user interaction simulation
- Setup file: `src/test/setup.ts`
- Coverage reports available in HTML and text format

## Important Files and Directories

- `astro.config.mjs`: Astro configuration with React and Tailwind integration
- `vitest.config.ts`: Testing configuration
- `src/pages/`: Astro pages (main entry points)
- `src/components/`: React components organized by feature
  - `src/components/flashcard/`: Flashcard-specific components
  - `src/components/auth/`: Authentication components
  - `src/components/ui/`: Reusable UI components
- `src/contexts/`: React Context providers for state management
- `src/hooks/`: Custom React hooks
- `src/utils/`: Utility functions including Firebase and SM-2 algorithm
- `src/types/`: TypeScript type definitions
- `src/data/`: Static flashcard data in JSON format
- `src/reducers/`: State management reducers
- `src/services/`: Service layer for business logic

## Code Standards and Best Practices

- **Keep code simple**: Favor readable, straightforward solutions over clever ones
- **Error handling**: Always implement proper error boundaries and user feedback
- **Edge cases**: Consider and handle edge cases (empty states, network failures, etc.)
- **Small incremental changes**: Make changes that can be tested step by step
- **Preserve comments**: Do not remove existing comments or code unless explicitly asked

## Architecture Patterns

### State Management

- React Context API for global state
- Reducers for complex state logic
- Local component state for UI-only state
- Session storage for guest mode
- Firestore for persistent user data

### Error Handling

- Error boundaries for React component errors
- Try-catch blocks for async operations
- User-friendly error messages
- Fallback UI states
- Network error handling with retry logic

### Component Organization

`components/flashcard/` # Domain-specific components
`components/auth/` # Authentication components
`components/ui/` # Reusable UI components

### Data Flow

1. User action triggers event
2. Context/reducer updates state
3. Optimistic UI update
4. Firebase operation (if authenticated)
5. Error handling and rollback if needed

## Development Workflow

### Making Changes

1. **Start small**: Make minimal changes that can be tested
2. **Test manually**: Verify changes work in browser
3. **Run tests**: Ensure existing functionality isn't broken
4. **Type check**: Verify TypeScript compilation
5. **Build check**: Ensure production build works

### Adding Features

1. Define TypeScript types first
2. Create components with proper error handling
3. Add tests for new functionality
4. Update documentation if needed
5. Consider edge cases and error states

### Debugging

- Use React Developer Tools
- Check browser console for errors
- Use Vitest for unit testing
- Test both guest and authenticated modes
- Verify Firebase operations in console

## Additional Notes

- Project uses PNPM workspaces configuration
- Firebase configuration required for full functionality
- Guest mode allows immediate app usage without authentication
- SM-2 spaced repetition algorithm implementation for learning optimization
- Child-friendly design with game-like interactions
- Optimistic UI updates for better user experience
- Proper error recovery mechanisms throughout the app

## Useful References

- [Astro Documentation](https://docs.astro.build/)
- [React 19 Documentation](https://react.dev/)
- [Firebase v9+ Documentation](https://firebase.google.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Framer Motion Documentation](https://www.framer.com/motion/)
