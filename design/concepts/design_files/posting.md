# Posting
## Concept specification
- Mostly same spec as assignment 2
- Created queries to get all posts by a specific user and get all posts in the database

## Concept implementation
- Wrote Posting.ts by hand, going based of the structure introduced in class and the LikertSurvey implementation example

## Testing
- Used Gemini 2.5 flash to generate tests
- Had to include --allow-read --allow-net --allow-env --allow-sys flags to run tests
- Had to reset database every step for assertions to be correct (every step test would assume it's getting a fresh database). used posts.drop()
- changed posting concept to make posts a private field, removing rep exposure
- Gemini did mess up a return type, causing a test to fail, but it was resolved and all tests passed
