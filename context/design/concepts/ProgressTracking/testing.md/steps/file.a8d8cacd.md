---
timestamp: 'Thu Oct 16 2025 10:46:25 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251016_104625.7a6b01f9.md]]'
content_id: a8d8cacd343d530a721f0d50b590850c4ee3bd5d24e5d213b763ee11bc10a796
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
  // The `getDb()` function is used here. For Deno.test, it's typically
  // expected that a `beforeAll` hook or the test runner itself manages database isolation.
  // Including `db.dropDatabase()` here for explicit clarity within the test setup,
  // assuming it runs once per test suite or is handled by the overall test runner's setup.
  const [db, client] = await getDb();
  await db.dropDatabase(); // Ensure a clean state for each test run (or test suite run)
  return [db, client];
}
```
