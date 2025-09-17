# Flashcard App - Project Structure

## Overview

This is a child-friendly flashcard learning application built with **Astro + React + TypeScript + Firebase**.

## Project Structure

```
src/
├── components/          # React components
│   ├── flashcard/      # Flashcard-specific components
│   └── ...
├── contexts/           # React Context providers
├── data/              # Static data (sample flashcards)
├── pages/             # Astro pages
├── types/             # TypeScript type definitions
├── utils/             # Utility functions
│   ├── firebase.ts    # Firebase configuration
│   ├── sm2.ts         # SM-2 algorithm implementation
│   └── ...
└── env.d.ts           # Global type declarations
```

## Technology Stack

- **Astro 5** - Static site generator with React integration
- **React 19** - UI framework with Context API for state management
- **TypeScript** - Type safety and enhanced developer experience
- **Firebase** - Authentication and Firestore database
- **React Router** - Client-side navigation for SPA behavior
- **Framer Motion** - Smooth animations and transitions
- **date-fns** - Date manipulation for SM-2 algorithm

## Key Features

- 🎯 **Spaced Repetition** - SM-2 algorithm for optimal learning
- 👤 **Guest Mode** - Try the app immediately with session storage
- 🔐 **User Accounts** - Firebase authentication for progress saving
- 📱 **SPA Experience** - Smooth navigation with React Router
- 🎨 **Child-Friendly UI** - Bright, game-like design with animations
- ⚡ **Optimistic Updates** - Instant UI feedback with error recovery

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm astro check
```

## Configuration

- **TypeScript**: Strict mode with enhanced type checking
- **Astro**: Configured for React SPA with client-side hydration
- **Firebase**: Authentication and Firestore integration
- **Path Mapping**: Clean imports with `@/` prefix
