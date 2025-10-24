# List Creation - Design Journey
The first change I needed to make was to bound a User characteristic to each list. This was relatively simple but added some additional requirements to all actions of the concept design. Namely, I had been conceptualizing the process for a single user, so I had to introduce an 'owner' User for all lists. This also required recording the User who was performing each action type and requiring that the acting User and owner were the same. This ensures that only a given User can create or modify their own lists. This aligns with how I had been mentally approaching the problem, but brought my thought process up to the necessary scope. 

[Corrected specificiation](../../../context/design/concepts/ListCreation/specification.md/steps/concept.a41a5856.md)

From there, I generated an implementation and test suite.

[Implementation](../../../context/design/concepts/ListCreation/implementation.md/steps/response.4d98d30e.md)

[Test suite](../../../context/design/concepts/ListCreation/testing.md/steps/response.e42b92bb.md)

However, I ran into some snags with this test suite. Specifically, it was using function calls like beforeAll that Deno did not seem to recognize. In my research, it doesn't seem like these features are native to the Deno framework, so I added the following line to the testing-concepts.md file that testing.md takes as context:

"Do not use t.beforeAll(), t.afterAll(), or t.beforeEach() as they are not supported in the Deno.test framework."

With this, I regenerated the test suite and was able to generate a valid set of tests.

[Corrected test suite](../../../context/design/concepts/ListCreation/testing.md/steps/response.fef07ddb.md)

Fortunately, all of these tests passed and behaved as desired.

[Test output](../../../context/design/concepts/ListCreation/testOutput.md/steps/_.56b54974.md)
