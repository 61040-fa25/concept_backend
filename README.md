# Academica Backend

[Design Changes](design/Design_Changes.md)\
[User Journey](design/UserJourney.md)\
[Design Study](design/DesignStudy)\
[Screen Recording](https://youtu.be/1FlhxO7HnOA?si=yCD9O86ecyt-06mn)


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
You can choose any [models](https://ai.google.dev/gemini-api/docs/models) using `GEMINI_MODEL`, such as `gemini-2.5-flash-lite` for faster responses, or `gemini-2.5-pro` for higher quality.

You may also edit the `./geminiConfig.json` file to change the parameters according to any of the [GenerationConfig](https://ai.google.dev/api/generate-content#v1beta.GenerationConfig) options, including turning on/off thinking, limiting tokens, etc.

## 4. Setup your MongoDB Atlas Cluster (free)

For this project, we'll be using MongoDB as the database. To get started, use either the slides or the instructions:
### Slides
[MongoDB Setup](https://docs.google.com/presentation/d/1DBOWIQ2AAGQPDRgmnad8wN9S9M955LcHYZQlnbu-QCs/edit?usp=sharing)
### Instructions
1. Create your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) account.
2. When selecting a template, choose the __free__ option, M0.
4. At the Security Quickstart page, select how you want to authenticate your connection and keep the rest of the defaults. Make sure to allow access to all IPs as shown in [this slide](https://docs.google.com/presentation/d/1DBOWIQ2AAGQPDRgmnad8wN9S9M955LcHYZQlnbu-QCs/edit?usp=sharing).
5. Once created, click the __CONNECT__ button, select __driver__, and copy the srv connection string. If using username and password, the url should look something like this: `mongodb+srv://<username>:<password>@cluster0.p82ijqd.mongodb.net/?retryWrites=true&w=majority`. Make sure to replace username and password with your actual values.
6. Add your connection url (without `<` and `>`) to `MONGODB_URL=<connection url>` to your `.env` file. 
7. Give your database a name under `DB_NAME=<your database name>`.

## 5. Install Obsidian

[Obsidian](https://obsidian.md)

Obsidian is an open-source Markdown editor and personal knowledge management solution. The Context tool **does not** require use of Obsidian, and you may use any preferred editor, but we highly recommend using Obsidian to navigate your assignment and the generated context to write, view, and structure your prompts and design documents. 

### Link settings

This should be correctly set already, but under Obsidian -> Settings -> Files and links, make sure that:
1. `New link format` is set to `Relative path to file`
2. `Use [[Wikilinks]]` is disabled
3. `Detect all file extensions` is enabled (so you can easily view code and drop links to code files)

![](media/obsidian_settings.png)

# Exercise 0 

Context is a simple Markdown-based framework for building design knowledge and collaborating with an LLM. There is no additional syntax: any text-based repository with code of any language with documentation written as Markdown is compatible.

## 0. Note

**Important:** do not delete or modify anything from the `context` directory. Content is hashed by ID, meaning that corruption can be detected, but not recovered from automatically. This pairs nicely with git in case you mess up, so don't forget to commit once in a while!

## 1. Getting started with Context

Context allows you to treat any Markdown document as a conversation with an LLM: everything in the document is exactly what both you and the LLM sees. Each step is broken up by `# Heading 1` sections, and you should begin every new prompt or chunk of interesting information using a new section 1 heading. 

### Task:

In `design/brainstorming/questioning.md`, complete the `# prompt: Why ... ?` with your burning question for the universe. Then, from the root of the repository, run this command in the terminal (if you're using Obsidian, you should be able to copy the command by clicking on `Shell` in the top right):

```shell
./ctx prompt design/brainstorming/questioning.md
```

You should see any thinking appear in the terminal, with the rest of the completion streamed into the file. In general, you can `prompt` a LLM to chime in with 

```shell
./ctx prompt <path_to_file>.md
```

where `<path_to_file>` is also a link **relative to the root** of the repository.

## 2. Including context

You can **include** other documents to embed their contents, allowing you to compose exactly the context that you want. In Obsidian's file explorer on the left, expand the `design/background` and `design/learning` folders, then click on `understanding-concepts`. This should open a blank document.

### Task:

Drag and drop `concept-design-overview` into the body of `understanding-concepts`. This should show up as a normal link. Then, to make it a link that Context will include, simply add the `@` sign to the beginning of the link text (the part in the brackets), like so:

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
