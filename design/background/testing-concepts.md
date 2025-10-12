# Concept Testing

Testing concepts involves primarily:
1. Confirming that for each action:
    - **requires** is satisfied: if a variety of test cases that do not fulfill the requirement are tested against the concept, they do not succeed (or return a record with an `error:` key).
    - **effects** is satisfied: after the action is performed, we can verify that the state did indeed change according to the effect (or the return is correctly specified).
2. Ensuring that the **principle** is fully modeled by the actions:
    - Demonstrate that the series of actions described in the **principle**, when performed, result in the specified behavior or updates to state.

Tests should cover the basic behavior of the concept but should also include some more interesting cases. They should also print helpful messages to the console with action inputs and outputs so that a human reader can make sense of the test execution when it runs in the console. Some more details about the test cases:
* Operational principle. A sequence of action executions that corresponds to the operational principle, representing the common expected usage of the concept. These sequence is not required to use all the actions; operational principles often do not include a deletion action, for example.
* Interesting scenarios. Sequences of action executions that correspond to less common cases: probing interesting corners of the functionality, undoing actions with deletions and cancellations, repeating actions with the same arguments, etc. In some of these scenarios actions may be expected to throw errors.
* Number required. For each concept, you should have one test sequence for the operational principle, and 3-5 additional interesting scenarios. Every action should be executed successfully in at least one of the scenarios.
* No state setup. Your test cases should not require any setting up of the concept state except by calling concept actions. When you are testing one action at a time, this means that you will want to order your actions carefully (for example, by the operational principle) to avoid having to set up state.

# approach: steps to testing

The following prefix format for header 1 blocks denote the relevant steps:

- `# file: src/{name}/{name}Concept.test.ts`
    - The test file for the concept
- `# trace:`
    - Describes a full trace of actions, such as how the principle is fulfilled.

After the concept specification and file, create another test file that properly tests the concept, and propose how the trace might work.

# Test implementation

While testing, use the `testDb` function, which returns a tuple of the database and client so that you can close it.

```typescript
import { testDb } from "@utils/database.ts";

Deno.test("...", async () => {
  const [db, client] = await testDb();

  // ... tests

  await client.close();
});
```

The database is already automatically dropped before every test file using the `Deno.test.beforeAll` hook: do not include any additional manipulation of the database for this purpose.

Use the Deno.test framework, splitting by appropriate test steps and describing each behavior. Import helpers from:

```typescript
import { assertEquals } from "jsr:@std/assert"; // or any other utility from the library
```

