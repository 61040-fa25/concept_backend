# Authenticate
## Concept spec
- Originally kept identical to assignment 2, was uncertain if it should be changed for actual use
- Went to office hours, was told spec was ok and connecting it to a service will be covered next week
- Added query to get users

## implementation
- Did by hand

## testing
- Used Gemini 2.5 flash to generate tests
- This time added an afterAll callback to tests to close db, but still used steps instead of separate tests
- realized afterAll probably refers to tests, not steps, so still wasn't working
- Tests for the most part were connected, so just needed to open and close new db for principle test
- After those minor changes (~4 lines), all tests passed
- For future: probably should separate isolated steps into different suites for organization purposes
