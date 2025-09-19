# UI Design and Interaction Prompt

This is an AI prompt template for building a child-friendly flashcard application interface. Use this as creative guidance while maintaining core functionality.

## Design Mission

Create a joyful, game-like learning interface for children studying Chinese vocabulary. The UI should feel like playing rather than studying, with bright colors, smooth animations, and intuitive interactions that encourage continued engagement.

## Core Design Principles

### Child-Friendly Experience

- **Visual Appeal**: Bright, cheerful colors with gentle gradients
- **Typography**: Round, friendly fonts that feel approachable
- **Interactions**: Large touch targets, satisfying animations, immediate feedback
- **Layout**: Clean, uncluttered spaces that don't overwhelm

### Key Data Structures

**Flashcard Example**:

```json
{
  "id": "nihao",
  "front": { "icon": "🗣️", "title": "你好", "description": "nǐ hǎo" },
  "back": {
    "icon": "👋",
    "title": "Hello",
    "description": "A greeting used when meeting someone"
  }
}
```

**User Progress Tracking**:

```json
{
  "easinessFactor": 2.5,
  "repetitions": 3,
  "nextReviewDate": "2025-09-20",
  "totalReviews": 15,
  "correctStreak": 5
}
```

## Component Architecture (Required Structure)

### 1. Dashboard Component

**Purpose**: Main landing screen with statistics and session initiation

**Required Elements**:

- Welcome message with app branding
- Progress statistics display (total cards, due cards, mastered cards)
- Primary action button to start review session
- Visual feedback for loading states

**Creative Freedom**: How you present statistics, animation styles, visual hierarchy

### 2. Review Component

**Purpose**: Interactive flashcard review interface

**Required Elements**:

- Card display with front/back flip mechanism
- Progress indicator showing current position
- 4-button quality rating system:
  - "Ask Me Again" (immediate retry)
  - "Hard" (difficult recall)
  - "Got It" (correct with effort)
  - "I Know" (effortless recall)

**Creative Freedom**: Card flip animations, button styling, visual feedback

### 3. Completion Component

**Purpose**: Session summary and celebration

**Required Elements**:

- Completion celebration
- Session statistics summary
- Navigation back to dashboard

**Creative Freedom**: Celebration animations, data visualization, reward mechanisms

## Interaction Flow Requirements

```text
Dashboard → Review Session → Card Interaction → Quality Rating → Next Card → Completion
```

## Technical Integration Points

**State Management**: Connect to React Context for flashcard data and session state

**Data Flow**: Handle card updates based on quality ratings using SM-2 algorithm

**Navigation**: Automatic routing based on session state

## Creative Opportunities

### Visual Design

- Color schemes that appeal to children
- Engaging animations and micro-interactions
- Custom illustrations or icons
- Playful typography choices

### User Experience

- Gamification elements (streaks, achievements)
- Encouraging feedback messages
- Smooth transitions between states
- Accessibility considerations

### Personalization

- Theme options
- Progress visualization styles
- Celebration customization
- Learning preference settings

## Implementation Guidelines

**Mobile-First**: Design for touch interactions and various screen sizes

**Performance**: Smooth animations without compromising responsiveness

**Accessibility**: Clear contrast, keyboard navigation, screen reader support

**Child Safety**: Age-appropriate content and interactions

Use this prompt to guide AI in creating engaging, child-friendly interfaces while maintaining the core learning functionality and flow.
