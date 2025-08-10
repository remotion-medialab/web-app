# Voice Reflection Web App

## Core Purpose

This application transforms voice recordings into structured reflection sessions, where users progress through 5 guided questions to build comprehensive weekly behavior plans and mental models of their thinking patterns.

### Key Directories

```
src/
├── components/          # Reusable UI components
├── contexts/           # React context providers
├── hooks/              # Custom React hooks
├── lib/                # Core business logic & services
├── pages/              # Route-based page components
├── types/              # TypeScript type definitions
├── constants/          # Application constants
└── utils/              # Utility functions
```

## Core Logic & Data Flow

### 1. Recording Session Management (`recordingsService.ts`)

**Core Purpose**: Groups individual voice recordings into structured 5-step sessions

**Key Logic**:

- **Session Grouping Algorithm**: Uses time proximity (1-hour windows) to group recordings into sessions
- **Step Validation**: Ensures each session contains recordings for steps 1-5
- **Data Transformation**: Converts Firestore documents to typed Recording objects
- **Automatic Association**: Links sessions to weekly plans based on date ranges

**Session Creation Logic**:

```typescript
// Groups recordings by temporal proximity
private static groupRecordingsIntoSessions(recordings: Recording[]): RecordingSession[]
```

**Usage Pattern**:

- Each session represents a complete reflection cycle
- Sessions are automatically associated with weekly plans
- Provides statistics for user insights

### 2. Weekly Planning System (`weeklyPlanService.ts`)

**Core Purpose**: Manages structured weekly behavior planning with 5-prompt framework

**Key Features**:

- **Week-based Organization**: Plans are tied to Monday-Sunday weeks
- **5-Prompt Framework**:
  1. Ideal week visualization
  2. Obstacle identification
  3. Prevention strategies
  4. Action planning with specifics
  5. If-then behavior implementation

**Data Association**:

- Links completed recording sessions to weekly plans
- Enables retrospective analysis of plan vs. actual behavior
- Provides historical tracking of behavior patterns

### 3. UI State Management (`OverviewPage.tsx`)

**Three-Panel Layout Logic**:

- **Left Panel**: Calendar view with daily recording sessions
- **Middle Panel**: Session details OR weekly planning form
- **Right Panel**: Mental model visualization (when recording selected)

**State Flow**:

```
Calendar Click → Session Details → Recording Selection → Mental Model
```

## 🔍 Mental Model Visualization

### Interactive Mind Map (`MentalModelViewer.tsx`)

- **Purpose**: Visual representation of thought patterns and relationships
- **Structure**:
  - Central node: Current situation/recording
  - Connected nodes: Related concepts and alternatives
  - Interactive: Click to explore "what-if" scenarios
- **Future Enhancement**: AI-generated alternative perspectives

## Data Structure

### Recording Model

```typescript
interface Recording {
  id: string;
  stepNumber: 1-5;           // Guided reflection step
  question: string;          // Prompt for this step
  transcription: {
    text: string;           // Voice-to-text content
    confidence: number;     // Transcription accuracy
  };
  activitySummary?: {       // Optional activity classification
    primaryActivity: string;
    confidence: number;
  };
}
```

### Session Model

```typescript
interface RecordingSession {
  sessionId: string;
  recordings: Recording[]; // 1-5 recordings, ordered by step
  completedAt: Date; // When session was completed
  isComplete: boolean; // Has all 5 steps
}
```

### Weekly Plan Model

```typescript
interface WeeklyPlan {
  weekStartDate: string; // Monday-based week
  responses: {
    idealWeek: string; // Vision for ideal week
    obstacles: string; // Identified challenges
    preventActions: string; // Strategies to prevent issues
    actionDetails: string; // Specific implementation plans
    ifThenPlans: string; // Behavior implementation rules
  };
  associatedSessionIds: string[]; // Linked reflection sessions
}
```

## User Journey Flow

1. **Sign In**: Firebase authentication
2. **Voice Recording**: 5-step guided reflection
3. **Session Creation**: Automatic grouping into sessions
4. **Calendar View**: Weekly/monthly overview
5. **Session Review**: Detailed transcription and analysis
6. **Weekly Planning**: Behavior plan creation
7. **Mental Model**: Visual exploration of thought patterns
8. **Progress Tracking**: Historical analysis and insights

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Configuration

Create `.env` file with:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

- **AI Integration**: Automatic insight generation from transcriptions
- **Advanced Analytics**: Pattern recognition across sessions
- **Export Features**: PDF reports and data export
- **Collaboration**: Share sessions with mentors/therapists
M