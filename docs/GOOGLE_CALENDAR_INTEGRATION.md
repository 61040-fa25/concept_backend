# Google Calendar Integration

## Overview

The Google Calendar integration allows users to export their course schedules directly to their Google Calendar. This creates recurring events for each course with all relevant information.

## Features

- ✅ Export entire schedules to Google Calendar
- ✅ Creates recurring events for the semester
- ✅ Includes course details (code, title, professor, location)
- ✅ Color-codes events by department
- ✅ Creates a dedicated calendar for the schedule (optional)
- ✅ OAuth2 authentication for secure access

## Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth2 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application"
4. Configure:
   - **Name**: Academica Calendar Integration
   - **Authorized redirect URIs**: 
     - `http://localhost:4173/auth/google/callback` (for development)
     - `https://yourdomain.com/auth/google/callback` (for production)
5. Save the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:4173/auth/google/callback
```

## API Endpoints

### 1. Get Authorization URL

**Endpoint**: `POST /api/GoogleCalendar/getAuthorizationUrl`

**Request Body**:
```json
{
  "clientId": "your-client-id.apps.googleusercontent.com",
  "redirectUri": "http://localhost:4173/auth/google/callback"
}
```

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=..."
}
```

**Usage**: Redirect the user to this URL to authorize access to their Google Calendar.

---

### 2. Exchange Code for Token

**Endpoint**: `POST /api/GoogleCalendar/exchangeCodeForToken`

**Request Body**:
```json
{
  "code": "authorization-code-from-google",
  "redirectUri": "http://localhost:4173/auth/google/callback",
  "clientId": "your-client-id.apps.googleusercontent.com",
  "clientSecret": "your-client-secret"
}
```

**Response**:
```json
{
  "accessToken": "ya29.a0...",
  "refreshToken": "1//...",
  "expiresIn": 3600
}
```

**Usage**: Exchange the authorization code received from Google for an access token.

---

### 3. Export Schedule to Calendar

**Endpoint**: `POST /api/GoogleCalendar/exportScheduleToCalendar`

**Request Body**:
```json
{
  "scheduleId": "schedule-id",
  "userId": "user-id",
  "accessToken": "ya29.a0...",
  "timeZone": "America/New_York",
  "semesterStart": "2025-01-21",
  "semesterEnd": "2025-05-15"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Successfully exported 5 events to Google Calendar",
  "eventsCreated": 5,
  "errors": [],
  "calendarId": "calendar-id@group.calendar.google.com"
}
```

## Frontend Integration Example

```typescript
// 1. Get authorization URL
const { authUrl } = await api.GoogleCalendar.getAuthorizationUrl({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirectUri: `${window.location.origin}/auth/google/callback`,
});

// 2. Redirect user to Google for authorization
window.location.href = authUrl;

// 3. Handle callback (in /auth/google/callback route)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');

if (code) {
  // Exchange code for token
  const { accessToken } = await api.GoogleCalendar.exchangeCodeForToken({
    code,
    redirectUri: `${window.location.origin}/auth/google/callback`,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  });

  // Store the access token securely
  sessionStorage.setItem('googleAccessToken', accessToken);
}

// 4. Export schedule
async function exportToCalendar(scheduleId: string, userId: string) {
  const accessToken = sessionStorage.getItem('googleAccessToken');
  
  if (!accessToken) {
    alert('Please authorize Google Calendar access first');
    return;
  }

  const result = await api.GoogleCalendar.exportScheduleToCalendar({
    scheduleId,
    userId,
    accessToken,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    semesterStart: "2025-01-21",
    semesterEnd: "2025-05-15",
  });

  if (result.success) {
    alert(`Successfully exported ${result.eventsCreated} courses to Google Calendar!`);
  } else {
    alert(`Export failed: ${result.message}`);
  }
}
```

## Event Details

Each course creates a recurring event with:

### Event Summary (Title)
- Format: `COURSE_CODE (SECTION) - TITLE`
- Example: `CS 101 (01) - Introduction to Computer Science`

### Event Description
```
Course: CS 101
Section: 01
Title: Introduction to Computer Science
Instructor: Dr. Jane Doe
Location: Science Building, Room 301
```

### Recurrence
- **Frequency**: Weekly
- **Days**: Based on course meeting days (e.g., MWF, TR)
- **Duration**: Entire semester (from `semesterStart` to `semesterEnd`)

### Color Coding
Events are color-coded by department:
- **CS** (Computer Science): Blue
- **MATH**: Green
- **ENG** (English): Red
- **HIST** (History): Yellow
- **AFR** (African Studies): Flamingo
- **ECON** (Economics): Orange
- **PHYS** (Physics): Cyan
- **CHEM** (Chemistry): Gray
- **Other**: Lavender (default)

## Security Best Practices

1. **Never expose client secrets in frontend code**
   - Store `GOOGLE_CLIENT_SECRET` only on the backend
   - Exchange tokens server-side

2. **Token Storage**
   - Store access tokens securely (use httpOnly cookies for production)
   - Never store tokens in localStorage (vulnerable to XSS)
   - Implement token refresh logic

3. **Validate Requests**
   - Always verify `userId` matches the authenticated user
   - Validate `scheduleId` ownership

## Semester Dates

Update these dates for each semester:

### Spring 2025
- Start: `2025-01-21`
- End: `2025-05-15`

### Fall 2025
- Start: `2025-08-25`
- End: `2025-12-15`

## Testing

Run tests with:
```bash
deno test --allow-read --allow-env --allow-net --allow-sys src/concepts/GoogleCalendar/GoogleCalendarConcept.test.ts
```

## Troubleshooting

### "Invalid time value" / RangeError
**Problem**: Getting "RangeError: Invalid time value" when exporting schedules.

**Cause**: Meeting times in the database have inconsistent formatting (e.g., "12:45PM" vs "12:45 PM").

**Solution**: The system now automatically handles both formats. If you still see this error:
1. Check your meeting_time format in the database
2. Ensure times follow either "HH:MM AM/PM" or "HH:MMAM/PM" format
3. Check the server console for specific parsing errors

**Fixed in v1.0**: The `convertTo24Hour` method now uses regex to handle both space and no-space formats.

### "Access Not Configured" Error
- Ensure Google Calendar API is enabled in your Google Cloud project

### "Invalid Grant" Error
- The authorization code has expired (valid for ~10 minutes)
- Request a new authorization code

### "Unauthorized" Error
- The access token has expired
- Implement refresh token logic to get a new access token

### Events Not Appearing
- Check the calendar ID in the response
- Verify semester start/end dates
- Ensure timezone is correct

### Some Courses Not Exported
- Check the server console for parsing errors
- Verify course has valid meeting_time or timeSlots data
- Ensure meeting times match the expected format: "MR - 11:20 AM - 12:35 PM"

## Limitations

- Access tokens expire after 1 hour
- Refresh tokens should be stored securely for long-term access
- Google Calendar API has rate limits (default: 1,000 requests/100 seconds)
- Maximum 2,500 events can be created per calendar

## Future Enhancements

- [ ] Automatic token refresh
- [ ] Bulk update/delete events
- [ ] Sync changes to existing events
- [ ] Support for exam schedules
- [ ] Office hours integration
- [ ] Custom event colors and reminders

