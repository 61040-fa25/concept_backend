---
timestamp: 'Sat Oct 18 2025 21:21:41 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251018_212141.c72c1d3b.md]]'
content_id: e9192049f960468f19cfd89e941390af60047fb876519da2b4be2ec009d73710
---

# response:

The "Leaks detected" errors you're seeing are a common issue when using the MongoDB driver (via `npm:mongodb`) in Deno's test environment. They indicate that certain asynchronous operations (specifically timers) are not being fully cleaned up by the MongoDB client before Deno finishes its leak detection for a given test.

Here's a breakdown of why this happens and what the errors mean:

**Why the errors occur:**

1. **MongoDB Driver's Internal Timers:** The MongoDB driver, when it establishes a connection (`MongoClient`), starts several internal background processes that rely on timers. These include:
   * **Server Discovery and Monitoring (SDAM):** The driver periodically pings the MongoDB server(s) to check their status, discover replica set members, and monitor for changes. This involves `setTimeout` calls to schedule these checks. (Mentioned in your stack traces: `mongodb/lib/sdam/monitor.js`)
   * **Connection Pooling (CMAP):** The driver maintains a pool of connections to the database. It might have timers to ensure a minimum number of connections are open, or to clean up idle connections. (Mentioned in your stack traces: `mongodb/lib/cmap/connection_pool.js`)

2. **Deno's Strict Leak Detection:** Deno's test runner is very strict about resource cleanup. After each `Deno.test` function completes, it checks for outstanding I/O operations, timers, and other resources. If any are still active that were started during that test (or lingered from a previous test), it reports a "Leaks detected" error.

3. **Timing Discrepancy:** Even when you call `await client.close()`, the MongoDB driver's internal cleanup of these timers and background tasks might not be *instantaneous*. There can be a very small delay (a few milliseconds) between when `client.close()` resolves and when all its internal timers are truly terminated and cleared from the event loop. Deno's leak detector might run during this brief window, catching timers that are still technically active but are in the process of being shut down.

**Understanding the specific error messages:**

* **"timers were started before the test, but completed during the test."**: This indicates that a `setTimeout` (or similar timer) was initiated by the MongoDB client from a *previous* `Deno.test` block. Even though you called `client.close()` in the previous test, that particular timer hadn't fully resolved or been cleared before the *next* test started, and then it fired *during* the subsequent test. This suggests `client.close()` isn't quite fast enough to clear everything before Deno runs the next test, or Deno reuses some underlying connection components which don't get fully reset.

* **"timers were started in this test, but never completed."**: This means a `setTimeout` was initiated by the MongoDB client *within the current test*, but by the time `client.close()` was called and the test function finished, Deno's leak detector found that timer still active (or in the process of being shut down). This is the same timing issue as above, just for timers originating in the current test.

**What this means for your tests:**

Your concept code and test logic are likely correct. You are correctly calling `await client.close()` at the end of each test. The errors are a result of the inherent asynchronous nature of the MongoDB driver's internal operations conflicting with Deno's aggressive leak detection, rather than a bug in *your* code's resource management.

**Potential Workarounds (as a last resort):**

While there isn't a "perfect" fix that doesn't involve some form of workaround or a change in Deno's or the MongoDB driver's behavior, here are common strategies:

1. **Add a small delay after `client.close()` (Least Recommended but often effective for testing):**
   You can introduce a tiny `setTimeout` after `client.close()` in your tests to give the MongoDB driver's internal cleanup a moment to complete. This is generally considered a hack but can make tests pass.

   ```typescript
   Deno.test("TaggingConcept: Some test", async () => {
     const [db, client] = await testDb();
     const tagging = new TaggingConcept(db);

     // ... test logic ...

     await client.close();
     // Add a small delay to allow internal timers to clear
     await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms might be enough
   });
   ```

   You would need to apply this to every test.

2. **Disable timer sanitization for specific tests (if available/desired):**
   Deno has options for `Deno.test` to disable sanitization. Disabling `sanitizeTimers` might prevent these warnings, but it also means you won't catch *actual* timer leaks if they occur in your application logic.

   ```typescript
   Deno.test({
     name: "TaggingConcept: Some test",
     sanitizeTimers: false, // Disable timer leak detection for this test
     async fn() {
       const [db, client] = await testDb();
       const tagging = new TaggingConcept(db);

       // ... test logic ...

       await client.close();
     },
   });
   ```

   This approach means you're explicitly saying "I know MongoDB leaks timers, ignore them."

3. **Use a single client for all tests in a file (if test isolation allows):**
   If your `testDb()` function *could* return a consistent client that is only connected once for the entire test *file* (using `Deno.test.beforeAll`) and then closed once (`Deno.test.afterAll`), it might reduce the number of client initialization/cleanup cycles and thus the chances of these leaks. However, your prompt specifically instructs to "open and close a new database for each test", implying a fresh database state per test. If `testDb()` also creates a *new physical database* for each test, then keeping the client open across tests would not be feasible for strict isolation. If it only creates a new client to an *existing* database and drops/recreates collections, then a single `MongoClient` might be possible.

Given the instructions to open and close a database for *each* test, the first workaround (a small delay) or disabling `sanitizeTimers` for those tests are your most direct options to suppress these warnings, with the understanding that they are typically benign for the MongoDB driver.
