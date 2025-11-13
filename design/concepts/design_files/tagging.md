# Tagging
## Concept spec
- Based on the feedback on assignment 2:
  - Changing generic Item to Book (no need for book concept, using books api where each book has an id)
  - Adding queries for:
    - Get tags by book
    - Get labels by book
    - Get books by label (1 or more)
    - Get books tagged by specific user
    - Get all labels used by specific user
    - Get all public tags
    - Get all tags
  - Specifying that only public tags are searchable to everyone

## Implementation
- Did by hand

## Testing
- Used Gemini 2.5 flash to generate tests
- This time specifying that Gemini should use separate tests over steps
- also decided to generate tests before actually writing functions (just using specs and function signatures)
- Gemini ignored my spec from the implementation file and just implemented the concept itself
- Gemini added extra preconditions so I had to change a few of the tests: specifically markPrivate and markPublic should still work even if the tag is already marked private/public respectively
- Kept getting a leak detected error; previous test suites, this was because the test didn't properly close the db; this time, however, it does, so I asked Gemini what the problem was
- According to Gemini, issue was related to await client.close() not fully closing the database before a certain timer interrupt; more to do with MongoDb instead of the test suite
- Fixed by adding a timer to the end of each test, not ideal but it did work
