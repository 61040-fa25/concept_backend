---
timestamp: 'Tue Oct 21 2025 15:37:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_153704.b2726aee.md]]'
content_id: 5c6079b5bc41abdd635842c464bdf920798b39e6ea13cc07287660d14dcff2c4
---

# response:

The error `MongoServerError: bad auth : authentication failed` is very clear: **Your Deno application is failing to authenticate with your MongoDB database.**

This means that the username or password (or both) provided in your MongoDB connection string is incorrect or doesn't match an existing user with the necessary permissions on your MongoDB server.

Here's a breakdown of why this might be happening and how to fix it:

### Common Causes

1. **Incorrect Username:** The username specified in your connection string doesn't exist or is misspelled.
2. **Incorrect Password:** The password specified in your connection string is wrong or misspelled.
3. **User Not Created:** You might not have created a database user specifically for your application.
4. **Insufficient Permissions:** Even if the username/password is correct, the user might not have the necessary roles (e.g., `readWrite` access) on the database your application is trying to connect to.
5. **Typo in Connection String:** A simple typo in the URI itself (host, port, database name, etc.) could sometimes lead to auth issues if it's trying to connect to the wrong place or with malformed credentials.
6. **Environment Variable Issues:** If your connection string (e.g., `MONGO_URI`) is read from an environment variable (like a `.env` file), the variable might be:
   * Missing.
   * Malformed.
   * Outdated (you changed the password but not the variable).
   * Not loaded correctly by Deno.
7. **Special Characters in Password:** If your password contains special characters (like `!`, `@`, `#`, `$`, etc.), they might need to be URL-encoded in the connection string.

### How to Debug and Fix It

1. **Verify Your MongoDB Credentials:**
   * **For MongoDB Atlas (Cloud):**
     * Go to your Atlas dashboard.
     * Navigate to "Database Access" under "Security."
     * Check the list of "Database Users."
     * **Ensure the username exists.**
     * If you're unsure of the password, click "Edit" on the user and choose "Set Password." **Generate a new secure password and immediately update your application's `MONGO_URI` with this new password.**
     * Also, ensure the user has the correct "Database User Privileges" (e.g., `Read and write to any database` or `Read and write to a specific database` where you select your application's database).
   * **For Local MongoDB (Self-hosted):**
     * Use `mongosh` or MongoDB Compass to connect to your local instance.
     * Check the users in your `admin` database or the database you're trying to connect to. You might need to add a user.
     * Example command to add a user in `mongosh`:
       ```javascript
       use admin; // Or your specific database
       db.createUser(
          {
            user: "yourAppName",
            pwd: "yourStrongPassword",
            roles: [ { role: "readWrite", db: "yourDatabaseName" } ]
          }
       );
       ```

2. **Check Your `MONGO_URI` (Connection String):**
   * Locate where you define and use your `MONGO_URI` in your Deno application (likely in `src/utils/database.ts`).
   * **Example format:** `mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority`
   * **Double-check every character** of the username and password against what you verified in step 1.
   * **URL Encoding:** If your password has special characters, make sure they are URL-encoded. For example, `#` becomes `%23`. Most drivers handle this automatically if you pass `username` and `password` separately, but if you're constructing the URI manually, be careful.
   * **Log the URI (Temporarily):** Add a `console.log()` statement *just before* you attempt to connect to MongoDB in `src/utils/database.ts` (e.g., line 15 or 16). Print the exact connection string your application is using. This will show you exactly what credentials Deno is sending.
     ```typescript
     // In src/utils/database.ts around line 15
     const mongoUri = Deno.env.get("MONGO_URI");
     if (!mongoUri) {
       throw new Error("MONGO_URI environment variable is not set.");
     }
     console.log("Attempting to connect with URI (password potentially masked for security):", mongoUri.replace(/:([^:]*)@/, ":****@")); // Mask password for log
     try {
       const client = new MongoClient();
       await client.connect(mongoUri); // This is line 16 or near it
       // ... rest of initMongoClient
     } catch (e) {
       throw new Error("MongoDB connection failed: " + e);
     }
     ```

3. **Verify Environment Variable Loading:**
   * If you're using a `.env` file, ensure you have a line like `import 'https://deno.land/std@0.207.0/dotenv/load.ts';` at the very beginning of your main script (`src/concept_server.ts`) or wherever `Deno.env.get` is first called, *before* any database connection attempts.
   * Make sure your `.env` file is in the root of your project or in a location Deno can find it.
   * Confirm the key in your `.env` file matches what you're trying to retrieve (`MONGO_URI=your_connection_string_here`).

4. **Check IP Whitelist (MongoDB Atlas specific):**
   * While "bad auth" usually means the connection *reached* the server but failed authentication, it's always good to double-check.
   * In MongoDB Atlas, go to "Network Access" under "Security."
   * Ensure your current public IP address (or `0.0.0.0/0` for development, though not recommended for production) is whitelisted.

By systematically going through these steps, you should be able to identify and correct the cause of your MongoDB authentication failure. The most common culprit is simply a typo in the username or password.
