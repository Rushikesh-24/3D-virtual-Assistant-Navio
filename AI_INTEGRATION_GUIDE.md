# AI Ride Assistant - Integration Guide

## Overview

The AI assistant has been enhanced to work with authenticated users and their ride-sharing data. It now uses the deepseek-r1:7b model via Ollama and can answer specific questions about user rides, statistics, and achievements.

## Features Added

### 1. User Authentication Integration

- Users must sign in with Clerk to access personalized features
- Guest users see general ride-sharing information
- Authenticated users get access to their personal data

### 2. App-Specific AI Responses

The AI can now answer questions about:

- **Upcoming rides**: "What are my upcoming rides?", "When is my next trip?"
- **Ride history**: "Show me my recent trips", "How many rides have I taken?"
- **Statistics**: "What are my ride statistics?", "What's my completion rate?"
- **Environmental impact**: "How much CO2 have I saved?", "What's my environmental impact?"
- **Achievements**: "Show me my achievements", "What badges have I earned?"
- **Financial data**: "How much money have I saved?", "What are my transaction stats?"

### 3. Suggested Questions

- Dynamic suggestions based on user's data
- Different suggestions for authenticated vs guest users
- Interactive buttons for quick queries

### 4. Language Support

- **Primary**: English (US/India)
- **Secondary**: Hindi (हिन्दी)
- Automatic voice selection based on language

### 5. Real-time Data Integration

Uses Convex functions to fetch:

- User profile data (`user.ts`)
- Ride information (`rides.ts`)
- Analytics and statistics (`analytics.ts`)
- Achievements (`achievements.ts`)
- Environmental impact data

## How It Works

### 1. Authentication Flow

```typescript
// Check if user is signed in
const { isSignedIn, isLoaded } = useUser();
const appData = useAppContext();

// Show sign-in if not authenticated
if (!isSignedIn) {
  return <SignIn />;
}
```

### 2. App Data Context

```typescript
// Fetch user data from Convex
const convexUser = useQuery(api.user.getUserByEmail, { email });
const userRides = useQuery(api.rides.getRidesByUser, { userId });
const rideStats = useQuery(api.analytics.getRideStats, {
  userId,
  timeframe: "30d",
});
```

### 3. AI Query Processing

```typescript
// Detect app-related queries
const isAppQuery = /ride|trip|stats|achievement|eco/.test(prompt.toLowerCase());

// Add context for app queries
if (isAppQuery && appData) {
  const userStats = formatUserStatsForAI(appData);
  const upcomingRides = formatUpcomingRidesForAI(appData.rides);
  // Pass to Ollama with context
}
```

## Setup Requirements

### 1. Ollama Model

```bash
# Pull the required model
ollama pull deepseek-r1:7b

# Start Ollama service
ollama serve
```

### 2. Environment Variables

```env
NEXT_PUBLIC_CONVEX_URL=your-convex-url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

### 3. Convex Functions

Ensure these Convex functions are available:

- `api.user.getUserByEmail`
- `api.rides.getRidesByUser`
- `api.analytics.getRideStats`
- `api.analytics.getFinancialStats`
- `api.analytics.getEnvironmentalImpact`
- `api.achievements.getUserAchievements`

## Example Queries

### For Authenticated Users

- "What are my upcoming rides?"
- "How many trips have I completed this month?"
- "What's my trust score and how can I improve it?"
- "Show me my environmental impact"
- "What achievements have I unlocked?"

### For Guest Users

- "How does ride sharing work?"
- "What are the benefits of carpooling?"
- "How can I save money on transportation?"

## UI Components

### 1. SuggestedQuestions

- Displays relevant questions based on user data
- Adaptive content for authenticated vs guest users
- Interactive buttons with icons

### 2. Authentication Status

- Header shows welcome message for authenticated users
- Connection indicator in status bar
- Real-time data access indicators

### 3. Voice Controls

- English as primary language
- Hindi as secondary option
- Automatic voice selection

## Technical Implementation

### Key Files Modified/Created

1. `src/hooks/useAppContext.ts` - App data integration
2. `src/hooks/useOllama.ts` - Enhanced with app query processing
3. `src/components/SuggestedQuestions.tsx` - Dynamic question suggestions
4. `src/app/page.tsx` - Authentication and integration
5. `src/app/ConvexClientProvider.tsx` - Convex setup

### Data Flow

1. User authenticates via Clerk
2. App fetches user data from Convex
3. AI assistant receives query
4. System determines if query is app-related
5. Relevant data is formatted and added to AI context
6. Ollama generates response with user-specific information
7. Response is spoken using selected voice/language

This integration provides a personalized, data-aware AI assistant that can help users with their specific ride-sharing needs and queries.
