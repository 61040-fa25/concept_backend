# Project Design: Interesting Moments #
Most of the design decisions I made throughout the project are in the files for the specific concepts, but these are some of the most interesting moments. Most of them are related to creating and using the test suites for each concept because that was the main way I used AI for this assignment.


- Resetting database
  - Some of the test suites Gemini generated had test blocks that were meant to be isolated from each other, but shared a database collection without emptying out first, causing the tests to fail despite a correct implementation. Gemini's test suite tried to fix this by adding a Deno.test.beforeEach() callback that would clear the database, but it wasn't working properly. I believe this is because the original test suite had one test function with individual test blocks being step functions within the test, so beforeEach() wouldn't actually run between steps. I ended up separating the tests into diffrent test functions, which also had the benefit of making it easier to run individual tests.
  - [Original Posting test suite](skrib\context\design\concepts\tests\posting_tests.md\steps\file.55d0b27d.md)
  - [Current Posting test suite](skrib\context\src\concepts\skrib\Posting.test.ts\20251017_134753.14bad3c8.md)
- Private fields
  - As I was implementing the first few concepts, I kept the MongoDb collections as public fields, mostly because I was using the LikertSurvey as an example and they kept it public. As I was testing it, however, I realized that the test suite Gemini generated was running operations directly on the collection instead of using queries to check the state of the set. Since I wanted to both test the queries and avoid rep exposure, I changed the collections to be private fields, forcing Gemini to use the queries in tests
  - [Implementation of Posting](skrib\context\src\concepts\skrib\Posting.ts\20251017_134758.dea5f162.md)
  - [Original Posting test suite](skrib\context\design\concepts\tests\posting_tests.md\steps\file.55d0b27d.md)
  - [New Posting test suite](skrib\context\src\concepts\skrib\Posting.test.ts\20251017_134753.14bad3c8.md)
- Leaks
  - For some of the test suites, I would get a failure because leaks were detected, timers were starting before the test and either finishing during them or never finishing at all. For most of the test suites, the error was due to not closing the MongoDb client after the test, but that wasn't the solution for Tagging. I couldn't figure out where the error was coming from, so I put it into context and was told that the issue wasn't with the actual tests, but that client.close() didn't finish resolving before the next test started. It gave me three workarounds, none of which were super ideal, but ultimately I ended up adding a 10ms timer after closing the client to give more time for the timers to resolve
  - [Errors](skrib\context\design\concepts\tests\tagging_tests.md\steps\error.8ee95e55.md)
  - [Gemini explanation and solutions](skrib\context\design\concepts\tests\tagging_tests.md\steps\response.e9192049.md)
- Test First Implementation
  - For the first concept I did, Posting, I implemented the class, gave that file and the concept specification as background, then had Gemini generate tests based on those. For the Tagging concept, however, I wrote a skeleton of the class implementation with just the function signatures and tried to have Gemini use that instead to generate tests to eliminate any possibility of the tests being based on the implementation. Gemini interpreted this as make a test suite and implement Tagging, so it wrote a Tagging class and based it's tests off of that instead. The tests for the most part still worked with my implementation, but I did have to change a few things:
    1. The AI implementation added an extra precondition that you can't mark a private tags as private again, which I didn't require, so I had to remove those tests
    2. The AI tested for specific error messages that I didn't use. Since the actual message of returned errors didn't really matter, I instead just tested that an error was returned
  - [AI implementation](skrib\context\design\concepts\tests\tagging_tests.md\steps\file.8cee4461.md)
  - [AI tests](skrib\context\design\concepts\tests\tagging_tests.md\steps\file.bd01d60d.md)
    - see lines 172, 232 for example of first issue, line 108 for example of second issue
  - [Final version of tests](skrib\context\src\concepts\skrib\Tagging.test.ts\20251019_105329.557b97c7.md)
- Tagging
  - Of all the concepts, this was the one I had to modify the most from assignment 2, mostly because the main thing that makes tagging interesting is the type of queries you can do with it and I originally didn't have any queries. The hardest part about implementing this was deciding what exactly I wanted to return with the queries, should it be tags (which are unique) or labels (which aren't), but I ultimately just decided to do two versions of certain queries, one that just returns a list of the tag objects and one that will return labels with a count of how many tags have that label
  - [Implementation of tagging](skrib\context\src\concepts\skrib\Tagging.ts\20251019_105329.ffa75414.md)

# Assignment 4b Changes #
There were two big changes I made to the backend over the course of this assignment.

- Creating a Shelf Concept: Originally, I was going to let users use Tags to mark books as read, want to read, currently reading, ect, but I realized this conflated 2 different purposes in one concept. I decided to create a new Shelving concept to implement this functionality, which made it easier to display tags and reading status separately in the final application.

- Altering _getBooksByTags action in Tag Concept: When searching books with multiple tags, I was originally going to let the user choose whether search results should have all of the tags, or just at least one. I changed the specification to just have results with all the tags, mostly because it made google books api calls easier.
