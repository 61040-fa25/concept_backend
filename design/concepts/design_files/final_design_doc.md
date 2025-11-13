# Project Design Document
Even though the overarching idea of Skrib has remained largely the same, there have been many iterations in how the key ideas and features have been implemented over the past three assignments. The purpose of this document is describe the major decisions I made and my motivations behind them.
# Assignment 4a: Backend Implementation #
Much of the backend was fairly straightforward to implement, with the concepts I created translating nicely into framework described in class. The majority of the work I did for this assignment was in making sure the test suites worked properly, but there still were some decisions and changes I had to make in the actual implementation.

## Private fields
  As I was writing the first few concepts, I kept the MongoDb collections as public fields, mostly because I was using the LikertSurvey as an example and they kept it public. As I was testing it, however, I realized that the LLM-generated test suite  was running operations directly on the collection instead of using queries to check the state of the set. Since I wanted to both test the queries and avoid representation exposure, I changed the collections to be private fields, forcing queries to be used in both testing and the eventual frontend.

  [Implementation of Posting](skrib\context\src\concepts\skrib\Posting.ts\20251017_134758.dea5f162.md)

  [Original Posting test suite](skrib\context\design\concepts\tests\posting_tests.md\steps\file.55d0b27d.md)

  [New Posting test suite](skrib\context\src\concepts\skrib\Posting.test.ts\20251017_134753.14bad3c8.md)


## Tagging
  Of all the concepts, this was the one I had to modify the most from Assignment 2, mostly because the main feature that makes tagging interesting is the type of queries you can do with it, and I originally didn't have any queries. The hardest part about implementing this was deciding what exactly I wanted to return with the queries, should it be tags (which include the user who made them and are unique) or labels (which don't include the creator and aren't necessarily unique), but I ultimately just decided to do two versions of certain queries, one that just returns a list of the tag objects and one that will return labels with a count of how many tags have that label.

  [Implementation of tagging](skrib\context\src\concepts\skrib\Tagging.ts\20251019_105329.ffa75414.md)

# Assignment 4b: Frontend Implementation #

When writing the frontend, I realized there were some additions and changes I had to make to my concepts, along with choices about the actual visual aspects of the application.

## Creating a Shelf Concept
 Originally, I was going to let users use Tags to mark books as read, want to read, currently reading, ect, but I realized this conflated 2 different purposes in one concept. I decided to create a new Shelving concept to implement this functionality, which made it easier to display tags and reading status separately in the final application.

## Altering _getBooksByTags action in Tag Concept
 When searching books with multiple tags, I was originally going to let the user choose whether search results should have all of the tags, or just at least one. I changed the specification to just have results with all the tags, mostly because it made google books api calls easier.

## Color palette and typography
 My color palette was inspired by old school picture book covers. I liked the warm, muted colors illustrators often used and the relaxed, cozy vibe it gave off, so I thought they would be a good source for a color palette for an application centered around finding and reading books.

 For typography, I was inspired by the bold, blocky fonts used in 70's R&B/soul album covers. I thought striking lettering would be a nice contrast to the more mellow colors. Even though these type of fonts are impractical for all the body text, I wanted to a similar approach for headings and the main site logo.

# Assignment 4c: Synchronization Implementation #
This final assignment was where I actually had to make the most backend changes, as I had to rely on specific queries and input/output types to be able to properly use syncs and move as many computations to the back end as possible

## Sessioning
 In order to have a more secure user authentication system that didn't just rely on the frontend caching user information, I had to have a concept that would create and handle session tokens. The Sessioning concept from lecture suited my needs perfectly, so the one I used is very similar to this one

## User authentication syncs
 Most of the syncs I wrote were requiring a session token to complete actions or queries, and using that to look up users if needed. To implement these, I had to write queries for most of my concept, since I hadn't yet included queries that returned a stored object given its id. This was also the point where I had to change/fix some of my return types. Some of my queries returned an array of primatives instead of an array of objects, which worked fine up until this point, but wasn't compatible with syncs.

 I also had to change the return types for some of my actions. I had most of my delete and edit actions return an empty js object on success and an object with an error field on failure, but when I used those actions in syncs, an empty return object would pattern match with a return object with an object with an error, so the request would get both a success and failure response on a failed action. To rectify this, I changed the empty object to an object with a success field.

 [Example of earlier implementation with empty return types: see removeBook method](../../../context/src/concepts/Shelving/Shelving.ts/20251028_210200.331b877a.md)
 [Current implementation](../../../context/src/concepts/Shelving/ShelvingConcept.ts/20251111_175547.f5d3f2a4.md)

## Other syncs
 There were two other syncs I wrote unrelated to authentication:
 1. A sync to automatically notify a user when they get a comment on their post or comment
 2. A sync to recursively delete the comments of a deleted post or comment
 Both of these were relatively straight forward to incorportate, I just had to comment out the logic handling that in the frontend

## Other changes
 I made some other minor UI changes in the frontends:
 1. I included a date field for posts and comments so the exact time of posting can be displayed and they can be sorted by most recent or most upvotes
 2. Before, I had tags that were user created and created by the GoogleBooks api go into the same field on the search page, but I decided it would be less confusing to separate them into different fields
