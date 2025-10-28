You are an expert TypeScript developer and testing engineer.

I have a file SessionConcept.ts that exports several asynchronous actions (functions) which interact with a database. The file uses TypeScript interfaces.

I also have a reference test file, LikertSurveyConcept.test.ts, which shows the exact structure, style, and conventions I want to replicate:

Using Deno’s std/testing/asserts.ts for assertions (assert, assertEquals, assertExists)

Using stubs, spies, and mocks for database calls

Structuring tests in isolated Deno.test blocks

Your task: Generate a complete test file called SessionConcept.test.ts that implements unit tests for all actions exported from SessionConcept.ts.

Requirements:

Follow the same style and structure as LikertSurveyConcept.test.ts.

Ensure each action is tested with proper mocking of the database (db.collection calls).

Respect the TypeScript interfaces (user) so that the tests type-check correctly.

Include tests for normal behavior, edge cases, and error handling where applicable.

Make each test independent and idempotent (state reset for each test).

Output a ready-to-use TypeScript test file that can be placed alongside SessionConcept.ts.