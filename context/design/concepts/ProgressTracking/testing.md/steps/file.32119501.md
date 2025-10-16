---
timestamp: 'Thu Oct 16 2025 10:32:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_103214.f2e300b6.md]]'
content_id: 32119501a31eda645438f4e05c0ef8c20bf70d0478f6fea8aeb87f6d6aebbc97
---

# file: src/utils/database.ts

```typescript
// src/utils/database.ts
// This file is assumed to exist based on the problem description.
// It provides utility functions like freshID and getDb.
import { MongoClient, Db } from "npm:mongodb";
// It's good practice to load .env for local development, assuming Deno.land/x/dotenv is used.
// For production, environment variables are typically managed by the deployment environment.
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

/**
 * Generates a fresh, unique ID.
 * In a real application, consider using a more robust UUID library.
 */
export function freshID(): ID {
  return crypto.randomUUID() as ID;
}

/**
 * Initializes and returns a MongoDB database client and DB instance.
 * Reads connection details from environment variables.
 */
export async function getDb(): Promise<[Db, MongoClient]> {
  const mongoUrl = Deno.env.get("MONGO_URL") || "mongodb://localhost:27017";
  const dbName = Deno.env.get("MONGO_DB_NAME") || "concept_db";
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  return [db, client];
}

/**
 * Provides a database instance for testing.
 * Automatically ensures a clean state by dropping the database (handled by Deno.test.beforeAll hook).
 */
export async function testDb(): Promise<[Db, MongoClient]> {
  // In a real testing setup, you might want to use a unique DB name per test run
  // or a more sophisticated cleanup. For this context, we assume a global hook
  // or manual cleanup before tests is handled by the Deno test runner itself.
  const [db, client] = await getDb();
  // For clarity, adding a dropDatabase call here, though Deno.test.beforeAll might handle it.
  // In a robust testing environment, consider unique database names for parallel tests.
  await db.dropDatabase();
  return [db, client];
}
```
