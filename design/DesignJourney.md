# Key Changes
1. Addition of authentication features. 

While working through a user journey on past assignments, it somehow slipped my mind that it would need to verify user identity to maintain the correct task, list, and session data. I think because the data isn't "sensitive" per-se, I failed to consider this factor. So, the first big change I had to make was add to User characteristics bound to each data type. This was relatively simple and gave me a good chance to really think through each component of my specs.

2. Scope of TaskBank.

Because I hadn't been considering the backend for multiple users, I was picture one big task bank. Rather than simply binding a User to each task within this big task bank, I reformatted to have a set of User-bound banks. This felt like it would best lend to modularity and future syncs. This change was slightly more significant than the others, but nothing crazy.

3. Persistance of Sessions. 

Given the way a Session would be used in the application, there is a benefit to having an active flag, but there is no use for having multiple inactive Sessions for the same user. This would make the amount of data more manageable and make cleanup easier throughout.

# Interesting Moments
1. Generating Deno test cases

The first interesting moment I ha with the Context tool was getting it it generate an operational test suite within the spec of Deno. The [first test suite](../context/design/concepts/ListCreation/testing.md/steps/response.e42b92bb.md) it generated looked really good in terms of what features it was testing of the implementation. However, it included t.beforeAll and t.afterAll calls that Deno did not seem to recognize. In order to fix this, I added a line to the testing-concepts.md file that is passed in as context:

"Do not use t.beforeAll(), t.afterAll(), or t.beforeEach() as they are not supported in the Deno.test framework."

With this change, I was able to generate [new test suite](../context/design/concepts/ListCreation/testing.md/steps/response.fef07ddb.md) that worked with Deno. After this, there was a slight snag of not properly building non-conflicting test cases, but I just went in and manually changed these as needed. With those changes, ListCreation was properly implemented and tested.

2. Accessing Private Fields

When implementing the Session concept, I found that the [generated test suite](../context/design/concepts/Session/implementation.md/steps/response.0b3372ee.md) was trying to make assertions based on the value of private fields to the implementation. This was interesting to me as it is a very common for humans to make when coding, but felt like something that would be more easily respected with agentic programming. 

Regardless, I felt like the easiest way to resolve this situation was to manually add getters to the implementation and use them in the test suite, so this is what I did. With these added, the tests ran successfully, meaning the structure was correct but had simply failed to respect the privacy of the implementation.

3. Incorrect Assumed Behavior

When implementing Session, I found that it was making a check on the assumption that the default state of a session was active when in both the [spec](/design/concepts/Session/specification.md) and [implementation](../context/design/concepts/Session/implementation.md/steps/response.0cb1a747.md) when in fact the default was inactive. 

In order to remedy this, I went in and added a getter for any Session associated with a given User. I also kept the getter for the active Session for a given User as this is the desired search for certain other test cases. By swapping this function in when just trying to check for existence of a Session, I was able to get the [related test cases passing](../context/design/concepts/Session/testOutput.md/steps/_.de36b013.md)

4. Suspected race condition

In the last leg of implementing Session, I had 1 test case failing -- the principal trace. However, while debugging, I added some print statements to both the implementation and test suite. When I ran it an hopes to explore the potential cause of the failure, I found that it passed. Upon further exploration, I found that it seemed to pass 1 out of every 8 times I ran it. When it failed, the desired query came back empty. 

While exploring, there was also one execution that [failed quite dramatically](../context/design/concepts/Session/testOutput.md/steps/_.2e28b97a.md). However, it occurred between two completely successful executions.

I experimented with [various added awaits or conditions](/src/concepts/Session/SessionConcept.ts), but could not find a waay to get it to pass consistently. Given the time constraint, I decided to move on to other aspects of my implementation, but I am planning to circle back to address this dilemma.

5. Strengthening test cases

Finally, when implementing TaskBank, I found that the [original test cases](../context/design/concepts/TaskBank/testing.md/steps/test.5cf5b987.md) threw a bunch of errors. I found that the cause of this was a failure to check the construction returned an error before checking for other features of the returned object.

This was a strange ommission given that similar checks had been made in previous test suites it had generated. Regardless, I felt it was easiest to simply [add these checks](../context/src/concepts/TaskBank/TaskBank.test.ts/20251019_150232.93d3dd4d.md) and get the test suite up and running. In doing so, [all the cases passed](../context/design/concepts/TaskBank/testOutput.md/steps/_.79916281.md), so the implementation of this concept overall went quite smoothly.