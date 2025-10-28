# Academica Backend - Design Changes

---

## Table of Contents

1. [CSVImport Concept](#csvimport-concept)
2. [GoogleCalendar Concept](#googlecalendar-concept)
3. [ProfessorRatings Concept](#professorratings-concept)
4. [Session Concept](#session-concept)

---

## CSVImport Concept

### Purpose
Enables bulk import of course section data from CSV files into the MongoDB database, providing a streamlined way to populate the system with institutional course offerings.

### Key Features
- **CSV Parsing**: Handles complex CSV formats with quoted fields and proper comma handling
- **Duplicate Prevention**: Automatically skips existing sections based on (course_code, section) pairs
- **Auto-Course Creation**: Creates course records automatically if they don't exist
- **Time Parsing**: Converts meeting time strings (e.g., "T - 12:45 PM - 3:25 PM") to structured TimeSlot format
- **Comprehensive Error Reporting**: Detailed feedback on import success, skips, and failures
- **Full CRUD Operations**: Search, query, and manage imported sections

### Data Model

**SectionDocument Schema**:
```typescript
{
  id: string;
  course_code: string;      // e.g., "AFR 105"
  section: string;          // e.g., "01"
  title: string;
  professor: string;
  meeting_time: string;     // e.g., "MWF - 10:00 AM - 10:50 AM"
  current_enrollment: number;
  seats_available: number;
  seats_total: number;
  distribution: string;     // e.g., "HS, SBA"
  semester: string;         // e.g., "Fall 2025"
  created_at: Date;
  updated_at: Date;
}
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/CSVImport/importSectionsFromCSV` | Import sections from a CSV file |
| `POST /api/CSVImport/getAllSections` | Retrieve all imported sections |
| `POST /api/CSVImport/searchSections` | Search sections by criteria |
| `POST /api/CSVImport/getSectionsByCourse` | Get sections for a specific course |
| `POST /api/CSVImport/clearAllSections` | Clear all imported sections |

### Usage Example

```bash
# Import via script
deno run --allow-read --allow-env --allow-net scripts/import_sections.ts data/sections.csv

# Import via API
POST /api/CSVImport/importSectionsFromCSV
{
  "filePath": "data/sections.csv"
}
```

### CSV Format Requirements

Required columns: `course_code`, `section`, `title`, `professor`, `meeting_time`, `current_enrollment`, `seats_available`, `seats_total`, `distribution`

Day abbreviations supported: M (Monday), T (Tuesday), W (Wednesday), R (Thursday), F (Friday)

### Documentation
- Full documentation: `docs/CSV_IMPORT_README.md`
- Import scripts: `scripts/import_sections.ts`

---

## GoogleCalendar Concept

### Purpose
Enables users to export their course schedules directly to Google Calendar as recurring events, providing seamless integration with their existing calendar workflows.

### Key Features
- **OAuth2 Authentication**: Secure Google account authorization
- **Recurring Events**: Creates semester-long recurring events for each course
- **Rich Event Details**: Includes course code, title, professor, location, and distribution
- **Color Coding**: Color-codes events by academic department
- **Dedicated Calendars**: Optional creation of separate calendars per semester
- **Timezone Support**: Proper timezone handling for accurate event times
- **Flexible Time Formats**: Handles both structured TimeSlot data and meeting_time strings

### OAuth Flow

1. **Get Authorization URL** → Redirect user to Google consent screen
2. **Exchange Code for Token** → Convert authorization code to access token
3. **Export Schedule** → Create calendar events using access token

### Data Model

**CalendarEvent Structure**:
```typescript
{
  summary: string;          // e.g., "AFR 105 - Introduction to Black Experience"
  description: string;      // Professor and course details
  location: string;         // Building and room
  start: {
    dateTime: string;       // ISO 8601 format
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  recurrence: string[];     // RRULE for semester duration
  colorId: string;          // Department color coding
}
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/GoogleCalendar/getAuthorizationUrl` | Get OAuth2 authorization URL |
| `POST /api/GoogleCalendar/exchangeCodeForToken` | Exchange auth code for access token |
| `POST /api/GoogleCalendar/exportScheduleToCalendar` | Export schedule to Google Calendar |
| `POST /api/GoogleCalendar/refreshAccessToken` | Refresh expired access token |

### Configuration Requirements

**Environment Variables**:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4173/auth/google/callback
```

**Google Cloud Setup**:
1. Enable Google Calendar API
2. Create OAuth 2.0 credentials (Web application)
3. Configure authorized redirect URIs

### Usage Example

```typescript
// 1. Get authorization URL
const { authUrl } = await api.GoogleCalendar.getAuthorizationUrl({
  state: "user-state-token"
});

// 2. Redirect user to authUrl

// 3. Exchange code for token (on callback)
const { accessToken, refreshToken } = await api.GoogleCalendar.exchangeCodeForToken({
  code: authorizationCode
});

// 4. Export schedule
const result = await api.GoogleCalendar.exportScheduleToCalendar({
  scheduleId: "schedule-id",
  userId: "user-id",
  accessToken: accessToken,
  timeZone: "America/New_York",
  semesterStart: "2025-01-21",
  semesterEnd: "2025-05-15"
});
```

### Documentation
- Full documentation: `docs/GOOGLE_CALENDAR_INTEGRATION.md`

---

## ProfessorRatings Concept

### Purpose
Integrates Rate My Professor data to provide students with professor ratings, difficulty levels, and "would take again" percentages directly within the course browsing experience.

### Key Features
- **Rate My Professor API Integration**: GraphQL API integration with RMP
- **Intelligent Caching**: 24-hour MongoDB-backed cache to minimize API calls
- **Performance Optimized**: 
  - Cache hit: ~10-50ms
  - Cache miss: ~500-2000ms
- **Graceful Fallback**: Returns null values for unrated professors without errors
- **Smart Name Parsing**: Handles titles like "Dr.", "Prof.", and compound names
- **Negative Caching**: Caches "not found" results to prevent repeated lookups

### Data Model

**ProfessorRating Schema**:
```typescript
{
  instructorName: string;
  schoolName?: string;
  rating: number | null;              // 0.0 - 5.0
  difficulty: number | null;          // 0.0 - 5.0
  numRatings: number;
  wouldTakeAgainPercent: number | null;  // 0.0 - 100.0
  lastUpdated: Date;
  rmpId?: string;
}
```

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/ProfessorRatings/getRatingForSection` | Get rating for a section's professor |
| `POST /api/ProfessorRatings/refreshRating` | Force refresh a cached rating |
| `POST /api/ProfessorRatings/getAllCachedRatings` | View all cached ratings |
| `POST /api/ProfessorRatings/clearCache` | Clear entire rating cache |

### Configuration Requirements

**Environment Variables**:
```env
RMP_API_BASE_URL=https://www.ratemyprofessors.com/graphql
RMP_SCHOOL_ID=1506  # Your institution's RMP ID
```

**Finding Your School ID**:
1. Visit https://www.ratemyprofessors.com
2. Search for your institution
3. Extract ID from URL: `https://www.ratemyprofessors.com/school/XXXX`

### Usage Example

```typescript
// Get rating for a section
const response = await fetch('/api/ProfessorRatings/getRatingForSection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sectionId: 'section-id' })
});

const { success, data } = await response.json();

// Example response:
// {
//   "success": true,
//   "data": {
//     "instructorName": "Kellie Cherie Carter Jackson",
//     "rating": 3.6,
//     "difficulty": 3.5,
//     "numRatings": 33,
//     "wouldTakeAgainPercent": 33.33,
//     "lastUpdated": "2025-10-26T23:54:42.601Z"
//   }
// }
```

### Cache Strategy

- **Expiration**: 24 hours
- **Storage**: MongoDB collection `professorRatings`
- **Indexing**: Indexed by `instructorName` for fast lookups
- **Persistence**: Cache survives server restarts

### Documentation
- Full documentation: `docs/PROFESSOR_RATINGS_README.md`
- Summary: `docs/PROFESSOR_RATINGS_SUMMARY.md`
- Frontend example: `docs/frontend-professor-rating-example.html`

---

## Session Concept

### Purpose
Manages user authentication sessions, allowing users to remain logged in for a defined period without re-authenticating for each action.

### Key Features
- **Automatic Expiration**: Sessions expire after 30 minutes of inactivity
- **Session Extension**: Users can extend their session or explicitly end it
- **Security**: Session IDs are randomly generated and stored securely
- **Validation**: Built-in session verification before protected actions
- **MongoDB-Backed**: Persistent session storage across server restarts

### Data Model

**SessionDoc Schema**:
```typescript
{
  _id: Session;        // Unique session ID
  userID: UserID;      // Associated user
  expiryTime: Date;    // When session expires
}
```

### Core Operations

#### 1. Start Session
```typescript
async startSession({ u: UserID }): Promise<{ session: Session }>
```
- Creates new session for authenticated user
- Sets expiration to current time + 30 minutes
- Returns session ID for client storage

#### 2. End Session
```typescript
async endSession({ s: Session }): Promise<Empty | { error: string }>
```
- Explicitly terminates a session
- Removes session from database
- Used for logout functionality

#### 3. Use Session
```typescript
async useSession({ s: Session }): Promise<Empty | { error: string }>
```
- Validates session exists and is not expired
- Used as middleware for protected routes
- Returns error if session invalid or expired

#### 4. Get Session User
```typescript
async getSessionUser({ s: Session }): Promise<{ user: UserID } | { error: string }>
```
- Retrieves user ID associated with a session
- Used to identify current user in requests

#### 5. Extend Session
```typescript
async extendSession({ s: Session }): Promise<Empty | { error: string }>
```
- Resets expiration time to current time + 30 minutes
- Allows users to stay logged in during active use

### Configuration

**Default Session Duration**: 30 minutes (configurable via `DEFAULT_SESSION_DURATION_MS`)

**Collection**: `UserSession.sessions`

### Usage Example

```typescript
// Login flow
const { session } = await SessionConcept.startSession({ u: userId });
// Store session ID in cookie or localStorage

// Protected route
const validation = await SessionConcept.useSession({ s: sessionId });
if ('error' in validation) {
  return { error: 'Unauthorized' };
}

// Get current user
const { user } = await SessionConcept.getSessionUser({ s: sessionId });

// Logout
await SessionConcept.endSession({ s: sessionId });
```

### Integration with Other Concepts

The Session concept is **foundational** and used by:
- **UserAuth**: Session creation after successful authentication
- **CourseScheduling**: Session validation before schedule modifications
- **LikertSurvey**: Session validation for survey responses
- **All protected endpoints**: Middleware for authorization

### Security Considerations

- Session IDs are UUIDs generated via `freshID()`
- Expiration is enforced at validation time
- Expired sessions can be cleaned up with periodic maintenance
- No sensitive data stored in session (only userID reference)

### Documentation
- Implementation: `src/concepts/Session/SessionConcept.ts`
- Tests: `src/concepts/Session/SessionConcept.test.ts`

---

## Architecture Overview

### Concept Independence

Each concept is designed to be:
- **Self-contained**: Manages its own database collections
- **Loosely coupled**: Minimal dependencies on other concepts
- **Well-documented**: Clear API contracts and usage examples
- **Testable**: Comprehensive test coverage

### Common Patterns

All concepts follow these patterns:
1. **MongoDB Integration**: Each concept receives a `Db` instance in constructor
2. **Collection Prefix**: Collections use concept-specific prefixes for namespace isolation
3. **Error Handling**: Return objects with `{ error: string }` for failures
4. **Type Safety**: Full TypeScript types for all interfaces and operations
5. **Environment Configuration**: External dependencies configured via environment variables

### Database Collections

| Concept | Collections |
|---------|-------------|
| CSVImport | `sections`, `courses` |
| GoogleCalendar | None (stateless OAuth) |
| ProfessorRatings | `professorRatings` |
| Session | `UserSession.sessions` |

### Deployment Checklist

When deploying these concepts, ensure:

1. **Environment Variables Set**:
   - MongoDB connection string
   - Google OAuth credentials (if using GoogleCalendar)
   - Rate My Professor school ID (if using ProfessorRatings)

2. **Database Indexes Created**:
   - CSVImport: Index on `course_code`, `section`
   - ProfessorRatings: Index on `instructorName`
   - Session: Index on `expiryTime` (for cleanup)

3. **Permissions Granted**:
   - File system access for CSV imports
   - Network access for external APIs
   - MongoDB read/write permissions

4. **Documentation Available**:
   - API reference docs in `docs/` folder
   - Example frontend integrations
   - Environment setup guides

---

## Future Enhancements

### Planned Improvements

1. **CSVImport**:
   - Batch import optimization for large files
   - Real-time progress reporting for long imports
   - Support for additional CSV formats

2. **GoogleCalendar**:
   - Sync updates (modify events when schedule changes)
   - Delete calendar events when courses are dropped
   - Support for other calendar services (Outlook, Apple Calendar)

3. **ProfessorRatings**:
   - Manual rating overrides for administrators
   - Historical rating trends
   - Integration with institutional faculty evaluations

4. **Session**:
   - "Remember me" functionality with longer sessions
   - Session activity tracking
   - Multi-device session management

---

## Support and Maintenance

### Documentation Structure

```
docs/
├── CSV_IMPORT_README.md              # CSVImport full guide
├── GOOGLE_CALENDAR_INTEGRATION.md    # GoogleCalendar setup and usage
├── PROFESSOR_RATINGS_README.md       # ProfessorRatings API reference
├── PROFESSOR_RATINGS_SUMMARY.md      # ProfessorRatings implementation notes
└── frontend-professor-rating-example.html  # Frontend integration example
```

### Getting Help

For questions or issues with any concept:
1. Check the concept-specific documentation in `docs/`
2. Review test files for usage examples
3. Check environment variable configuration
4. Verify MongoDB connection and collection setup

---

*This document serves as a high-level overview. Refer to individual documentation files for detailed implementation guides, API references, and troubleshooting information.*
