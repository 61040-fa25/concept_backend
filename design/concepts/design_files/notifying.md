# Notifying
## Concept spec
- Added read flag to notification
- Added read action that sets flag to true
- Added queries get notifications by user, get read/unread notifications by user, get all notifications

## Implementation
- Did by hand, similar to posting

## Testing
- Used Gemini 2.5 flash to generate tests
- First run wasn't doing robust type checking, causing errors, had Gemini fix
- Again, had to create new database for each test
- Then, all tests passed
