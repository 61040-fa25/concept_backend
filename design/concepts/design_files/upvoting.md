# Upvoting
## Concept spec
- Added queries get votes from user, get votes on an item, get all votes

## implementation
- Did by hand, similar to posting

## testing
- Used Gemini 2.5 flash to generate tests
- This time, included statement in prompt to open and close new database for each test, Gemini instead created tests so that they depend on each other
- Operating priniciple test was still designed to be isolated from other tests, so had to manually open and close db for that test
- After doing so, whole suite passed
