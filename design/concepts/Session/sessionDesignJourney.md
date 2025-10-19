# Session - Design Journey
In implementing the Session concept, the first hurdle was the same as when implementing ListCreation: I needed to add a feature of ownership for authentication purposes. I added this to the state and the necessary 'requires' statements to the actions relatively easily.

[Initial spec](../../../context/design/concepts/Session/specification.md/steps/concept.8754b7d7.md)

With the concept updated based on this feedback, I generated the source code and test cases for the Session concept. 

[Initial source code](../../../context/design/concepts/Session/implementation.md/steps/response.8fe9136b.md)

[Initial test cases](../../../context/design/concepts/Session/testing.md/steps/response.b79b8b04.md)

Interestingly, these test cases were not all successful. 

[Initial test output](../../../context/design/concepts/Session/testOutput.md/steps/_.4fcff608.md)

In doing so, I also encountered some snags regarding whether my current concept design is at the right scale. As it stands, the concept encapsulates one Session, rather than a set of Sessions. For the sake of modularity, I feel as though this introduces some difficulties in verifying conditions for future actions. So, before tackling the test cases issue, I modified my spec to reflect instead the set of Sessions.

[Modified spec](../../../context/design/concepts/Session/specification.md/steps/concept.53fc528b.md)

Having modified the spec, I re-generated an implementation and test suite with Context.

[Modified implementation](../../../context/design/concepts/Session/implementation.md/steps/response.0cb1a747.md)

[Modified test suite](../../../context/design/concepts/Session/implementation.md/steps/response.0b3372ee.md)

Before I was able to test the new implementation against this test suite, I had to fix a few structural problems with the code. This included some invalid imports and some attempts to access private fields of the SessionConcept implementation. It was interesting to me that the Context-generated code violated the privacy of its own generated concept. Regardless, I went in to fix the few bugs it had produced, so I had the following test suite.

[Fixed test suite](../../../context/src/concepts/Session/SessionConcept.test.ts/20251018_160300.5067d2fd.md)

Unfortunately, upon running this, I found that most of the test cases were not passing.

[New test output](../../../context/design/concepts/Session/testOutput.md/steps/_.68757996.md)

To tackle this, I first had to modify a function definition in the implementation. With the generated implementation, it was assuming that a session would default to active on instantiation. This is the opposite of the spec, so I had to change it to not require this value. With this change, most of the test cases were passing.

[New test output](../../../context/design/concepts/Session/testOutput.md/steps/_.de36b013.md)

The first test case was failing due to a change to the spec. I realized that there is no reason for a user to have multiple sessions, so the change of session can delete the old session from the database. To do this, I added two new methods to the implementation: getSessionForOwner and deleteSession. Then, I modified the changeSession feature to delete an existing session. 

For the second test case, I had quite a strange experience debugging it. The problem was that the sessionDoc was being read as empty, so we couldn't continue with subsequent checks. In my various iterations of running it, I uncovered that it was not failing all of the time. Instead, it seemed to fail something like 1 in every 8 runs. I added various print statements and checks, but could not find a way to avoid this or properly identify a root cause. Then, on one iteration, everything seemed to break.

[Broken test output](../../../context/design/concepts/Session/testOutput.md/steps/_.2e28b97a.md)

This situation was even less replicable as the smaller broken case. Still, from my exploration, it seems as though this must be the product of some sort of race condition. I attempted to remedy this, I added retries to hopefully give the database time to catch up and accurately reflect what has been added to it. Unfortunately, despite my best efforts, I could not find a way to get this case to pass 100% of the time.