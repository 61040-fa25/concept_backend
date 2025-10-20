---
timestamp: 'Sun Oct 19 2025 19:58:02 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_195802.c21f076a.md]]'
content_id: dbf63fbdb6e4088bbadbc3d1e32dc1763a80b73085f48b1bd9757004c9428f12
---

# file: src\mirrorMotionConcepts\User.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";

const userA = "username:Alice" as ID;
// const respondentB = "respondent:Bob" as ID;
// const respondentC = "respondent:Charlie" as ID;

import UserConcept from "./UserConcept.ts";

Deno.test("Principle: After registering with a username and password, the user can log in to their account", async () => {
  const [db, client] = await testDb();
  const userConcept = new UserConcept(db);

  try {
    // 1. User creates a new user with username and password
    const createUserResult = await userConcept.register({
      username: userA,
      password: "pswTest",
    });
    assertNotEquals(
      "error" in createUserResult,
      true,
      "User creation should not fail.",
    );
    const { userID } = createUserResult as { userID: ID };
    assertExists(userID);

    // 2. User logs in with the correct username and password
    const loginResult = await userConcept.login({
      username: userA,
      password: "pswTest",
    });
    assertNotEquals(
      "error" in loginResult,
      true,
      "User login should not fail.",
    );
    const { userID: loggedInUserID } = loginResult as { userID: ID };
    assertExists(loggedInUserID);
    assertEquals(loggedInUserID, userID);
  } finally {
    await client.close();
  }
});

```
