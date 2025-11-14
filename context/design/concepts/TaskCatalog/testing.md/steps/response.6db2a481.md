---
timestamp: 'Tue Oct 14 2025 22:58:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251014_225838.e68d9cb0.md]]'
content_id: 6db2a481e0b1fd4dd15138b30b8d4044054329e64ce2bdb11df6785c76573077
---

# response:

This error (`NotCapable: Requires read access to ".env", run again with the --allow-read flag`) indicates that Deno's runtime is preventing your test script from reading the `.env` file because it doesn't have the necessary permission. Deno prioritizes security and requires explicit flags for such operations.

The fix is not in the code itself, but in how you execute the test command. You need to provide the `--allow-read` flag, and likely also `--allow-net` (for connecting to MongoDB) and `--allow-env` (for reading environment variables from `.env`).

**To resolve this, run your test command with the following flags:**

```bash
deno test --allow-read --allow-net --allow-env src/concepts/TaskCatalog/TaskCatalog.test.ts
```

This will grant the necessary permissions for your test to initialize the database by reading the `.env` file and connecting to MongoDB.
