# Task Bank - Design Journey
Much like the other two, the first step of this was incorporating a User feature into my spec. To do this, I decided to have the User be the highest level. Thus, instead of associating each tasks with a user, each user is associated with a set of tasks.

[Specification](../../../context/design/concepts/TaskBank/specification.md/steps/concept.d26f7575.md)

Given this discrepancy, I decided not to copy over my AI-augmented implementation from assignment 3. I will likely encorporate the AI-augmentation in the near future, but for this assignment, I wanted to focus on making sure the scope of each of my concepts was correct. With that corrected, I generated an implementation and test suite.

[Implementation](../../../context/design/concepts/TaskBank/implementation.md/steps/response.2fbb7018.md)

[Test suite](../../../context/design/concepts/TaskBank/testing.md/steps/test.5cf5b987.md)

However, I found that there were a bunch of errors in the test code. I found that the cause of this was a failure to check if a certain method had returned an error. So, I went through and added the necessary checks.

[Fixed test suite](../../../context/src/concepts/TaskBank/TaskBank.test.ts/20251019_150232.93d3dd4d.md)

With these fixes, I was able to test the implementation and found that all of the test cases passed.

[Test output](../../../context/design/concepts/TaskBank/testOutput.md/steps/_.79916281.md)