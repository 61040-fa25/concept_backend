# Academica Backend

[Design Changes](design/Design_Changes.md)\
[User Journey](design/UserJourney.md)


### Starting the Server
```powershell
deno run --allow-net --allow-read --allow-write --allow-env --allow-sys src/concept_server.ts --port 8001
```

### Killing the Server
```powershell
# Kill all Deno processes (recommended)
Get-Process | Where-Object {$_.ProcessName -eq "deno"} | Stop-Process -Force

# Alternative: Kill by specific port
netstat -ano | findstr :8001
taskkill /PID XXXX /F  # Replace XXXX with the actual PID
```

### Testing the Server
```powershell
# Test if server is running
Invoke-WebRequest -Uri "http://localhost:8001/" -Method GET

# Test UserAuth register endpoint
Invoke-WebRequest -Uri "http://localhost:8001/api/UserAuth/register" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"username":"testuser","password":"testpass"}'

```

## Available Endpoints
- **UserAuth**: `/api/UserAuth/register`, `/api/UserAuth/authenticate`
- **CourseScheduling**: `/api/CourseScheduling/*`
- **CourseFiltering**: `/api/CourseFiltering/*`
- **GoogleCalendar**: `/api/GoogleCalendar/*` 📅 **NEW**
- **LikertSurvey**: `/api/LikertSurvey/*`
- **Session**: `/api/Session/*`
- **ProfessorRatings**: `/api/ProfessorRatings/*`
- **CSVImport**: `/api/CSVImport/*`


---

# Course Scheduling
1. [Testing Output](design/concepts/CourseScheduling/test_output.md)
2. [Design](design/concepts/CourseScheduling/design_changes.md)
3. [Spec](src/concepts/CourseScheduling/CourseScheduling.spec)
4. [Concept Implimentation](src/concepts/CourseScheduling/courseSchedulingConcept.ts)
5. [Testing Implimentation](src/concepts/CourseScheduling/courseSchedulingConcept.test.ts)

# Course Filtering
1. [Concept Implementation](src/concepts/CourseFiltering/CourseFilteringConcept.ts)
2. [Testing Implementation](src/concepts/CourseFiltering/courseFilteringConcept.test.ts)

# Google Calendar Integration 📅
**Export your course schedule to Google Calendar with one click!**

1. [📚 Full Documentation](docs/GOOGLE_CALENDAR_INTEGRATION.md)
2. [Concept Implementation](src/concepts/GoogleCalendar/GoogleCalendarConcept.ts)
3. [Testing Implementation](src/concepts/GoogleCalendar/GoogleCalendarConcept.test.ts)

### Features
- ✅ Export entire schedules to Google Calendar
- ✅ Creates recurring events for the semester
- ✅ Color-coded by department
- ✅ Includes professor, location, and meeting times
- ✅ OAuth2 secure authentication

### Quick Start
```typescript
// 1. Get Google OAuth URL
const { authUrl } = await api.GoogleCalendar.getAuthorizationUrl({
  clientId: "your-client-id.apps.googleusercontent.com",
  redirectUri: "http://localhost:4173/auth/google/callback"
});

// 2. Redirect user to authUrl for authorization

// 3. Export schedule
await api.GoogleCalendar.exportScheduleToCalendar({
  scheduleId: "schedule-id",
  userId: "user-id",
  accessToken: "google-access-token",
  semesterStart: "2025-01-21",
  semesterEnd: "2025-05-15"
});
```

See [full documentation](docs/GOOGLE_CALENDAR_INTEGRATION.md) for setup instructions.
