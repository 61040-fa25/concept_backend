[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# test: PlatformLink

# response:


# response:

# test: PlatformLink

# file: src/platformlink/PlatformLinkConcept.test.ts

```typescript
import { assertEquals, assert, assertExists } from "jsr:@std/assert";
import { testDb } from "../../utils/database.ts";
import PlatformLinkConcept from "./PlatformLinkConcept.ts";
import { ID } from "../../utils/types.ts";

// Helper dummy IDs for testing
const userA = "user:A" as ID;
const userB = "user:B" as ID;

Deno.test("PlatformLinkConcept", async (t) => {
  const [db, client] = await testDb();
  const platformLink = new PlatformLinkConcept(db);

  await t.step("link action", async (t) => {
    await t.step("should link a new account for a new user successfully", async () => {
      const result = await platformLink.link({ userId: userA, platform: "spotify" });
      assert(!("error" in result), "Link action should not return an error");

      const { linkId } = result;
      assertExists(linkId);

      const linkDoc = await db.collection("PlatformLink.links").findOne({ _id: linkId });
      assertExists(linkDoc);
      assertEquals(linkDoc.userId, userA);
      assertEquals(linkDoc.platform, "spotify");

      const userDoc = await db.collection("PlatformLink.users").findOne({ _id: userA });
      assertExists(userDoc);
    });

    await t.step("should fail to link an unsupported platform", async () => {
      const result = await platformLink.link({ userId: userB, platform: "tidal" });
      assert("error" in result, "Should return an error for unsupported platform");
      assertEquals(result.error, "Platform 'tidal' is not supported.");
    });

    await t.step("should fail if a link already exists for the user and platform", async () => {
      // First link is successful (from previous test)
      const result = await platformLink.link({ userId: userA, platform: "spotify" });
      assert("error" in result, "Should return an error for duplicate link");
      assertEquals(result.error, "User already has a link for platform 'spotify'.");
    });
  });

  await t.step("refresh action", async (t) => {
    await t.step("should refresh an existing token successfully", async () => {
      const linkResult = await platformLink.link({ userId: userB, platform: "youtube_music" });
      assert(!("error" in linkResult));
      const { linkId } = linkResult;

      const oldLinkDoc = await db.collection("PlatformLink.links").findOne({ _id: linkId });
      assertExists(oldLinkDoc);

      const refreshResult = await platformLink.refresh({ linkId });
      assert(!("error" in refreshResult));
      assert(refreshResult.newExpiration > oldLinkDoc.tokenExpiration, "New expiration should be later than the old one");

      const newLinkDoc = await db.collection("PlatformLink.links").findOne({ _id: linkId });
      assertExists(newLinkDoc);
      assert(newLinkDoc.tokenExpiration > oldLinkDoc.tokenExpiration);
      assert(newLinkDoc.accessToken !== oldLinkDoc.accessToken);
    });

    await t.step("should fail to refresh a non-existent link", async () => {
      const nonExistentId = "link:nonexistent" as ID;
      const result = await platformLink.refresh({ linkId: nonExistentId });
      assert("error" in result);
      assertEquals(result.error, `Link with id '${nonExistentId}' not found.`);
    });
  });

  await t.step("revoke action", async (t) => {
    await t.step("should revoke an existing link successfully", async () => {
      const linkResult = await platformLink.link({ userId: userB, platform: "spotify" });
      assert(!("error" in linkResult));
      const { linkId } = linkResult;

      // Manually add a capability to test cascade delete
      await db.collection("PlatformLink.capabilities").insertOne({ linkId, capability: "test_capability" });

      const revokeResult = await platformLink.revoke({ linkId });
      assert(!("error" in revokeResult));
      assertEquals(revokeResult.removed, true);

      const linkDoc = await db.collection("PlatformLink.links").findOne({ _id: linkId });
      assertEquals(linkDoc, null);

      const capabilityDoc = await db.collection("PlatformLink.capabilities").findOne({ linkId });
      assertEquals(capabilityDoc, null);
    });

    await t.step("should fail to revoke a non-existent link", async () => {
      const nonExistentId = "link:nonexistent" as ID;
      const result = await platformLink.revoke({ linkId: nonExistentId });
      assert("error" in result);
      assertEquals(result.error, `Link with id '${nonExistentId}' not found.`);
    });
  });

  await t.step("can action", async (t) => {
    const linkResult = await platformLink.link({ userId: userA, platform: "youtube_music" });
    assert(!("error" in linkResult));
    const { linkId } = linkResult;

    // Manually add a capability since there is no action for it
    await db.collection("PlatformLink.capabilities").insertOne({ _id: "cap:1" as ID, linkId, capability: "play_music" });

    await t.step("should return true for a valid link with the right capability", async () => {
      const result = await platformLink.can({ linkId, capability: "play_music" });
      assertEquals(result.ok, true);
    });

    await t.step("should return false if the capability does not exist", async () => {
      const result = await platformLink.can({ linkId, capability: "skip_ad" });
      assertEquals(result.ok, false);
    });

    await t.step("should return false if the link token is expired", async () => {
      // Manually expire the token
      const pastTime = Date.now() - 1000;
      await db.collection("PlatformLink.links").updateOne({ _id: linkId }, { $set: { tokenExpiration: pastTime } });

      const result = await platformLink.can({ linkId, capability: "play_music" });
      assertEquals(result.ok, false);
    });

    await t.step("should return false for a non-existent link", async () => {
      const nonExistentId = "link:nonexistent" as ID;
      const result = await platformLink.can({ linkId: nonExistentId, capability: "play_music" });
      assertEquals(result.ok, false);
    });
  });

  // Clean up before the final trace test
  await db.dropDatabase();

  await t.step("Principle Trace: Full lifecycle of a platform link", async () => {
    const platform = "spotify";
    const capability = "create_playlist";
    let linkId: ID;

    // 1. A user links their account
    const linkResult = await platformLink.link({ userId: userA, platform });
    assert(!("error" in linkResult), "Trace step 1: Linking failed");
    linkId = linkResult.linkId;

    // 2. The app verifies a capability, but it doesn't exist yet
    let canResult = await platformLink.can({ linkId, capability });
    assertEquals(canResult.ok, false, "Trace step 2: Should not have capability yet");

    // 3. The app (simulated) grants the capability after an OAuth flow
    await db.collection("PlatformLink.capabilities").insertOne({ _id: "cap:2" as ID, linkId, capability });

    // 4. The app checks again, and now it should succeed
    canResult = await platformLink.can({ linkId, capability });
    assertEquals(canResult.ok, true, "Trace step 4: Should now have capability");

    // 5. Time passes, and the app refreshes the token to keep access
    const refreshResult = await platformLink.refresh({ linkId });
    assert(!("error" in refreshResult), "Trace step 5: Refresh failed");

    // 6. The app checks again to ensure access is still valid
    canResult = await platformLink.can({ linkId, capability });
    assertEquals(canResult.ok, true, "Trace step 6: Should still have capability after refresh");

    // 7. The user revokes the link
    const revokeResult = await platformLink.revoke({ linkId });
    assert(!("error" in revokeResult) && revokeResult.removed, "Trace step 7: Revoke failed");

    // 8. The app checks a final time; access should be denied
    canResult = await platformLink.can({ linkId, capability });
    assertEquals(canResult.ok, false, "Trace step 8: Access should be denied after revoke");
  });

  await client.close();
});
```

# trace:

The operational principle of the `PlatformLink` concept is that a user can link their streaming platform account, which allows the application to securely interact with the platform on their behalf (e.g., check capabilities, refresh tokens) without other parts of the application needing to handle sensitive credentials. This lifecycle can be traced through the concept's actions:

1.  **`link`**: A user `userA` decides to connect their Spotify account to the application. The application calls `PlatformLink.link({ userId: "user:A", platform: "spotify" })`. This action creates a new link record, stores a newly acquired access token and its expiration date, and returns a unique `linkId`.
2.  **Grant Capability (External)**: As part of the authentication flow with Spotify, the application determines that `userA` has granted permission to `create_playlist`. The application's backend records this by inserting a document into the `PlatformLink.capabilities` collection: `{ linkId: <linkId_from_step_1>, capability: "create_playlist" }`.
3.  **`can`**: Another concept in the application wants to create a playlist for `userA`. Before attempting the API call to Spotify, it first checks for permission by calling `PlatformLink.can({ linkId: <linkId_from_step_1>, capability: "create_playlist" })`. This returns `{ ok: true }` because the link is active (token is not expired) and the capability exists.
4.  **`refresh`**: Some time later, a background job in the application notices the access token for the link is about to expire. It calls `PlatformLink.refresh({ linkId: <linkId_from_step_1> })`. The concept handles the logic of getting a new access token from Spotify, updates the link record with the new token and a new, later expiration time, and returns the new expiration time.
5.  **`can` (Post-Refresh)**: The other concept again needs to check if it can create a playlist. It calls `PlatformLink.can(...)` as before. The result is still `{ ok: true }` because the token has been successfully refreshed.
6.  **`revoke`**: The user `userA` decides they no longer want the application connected to their Spotify account. They click "Disconnect" in the UI, which triggers a call to `PlatformLink.revoke({ linkId: <linkId_from_step_1> })`. This action deletes the link record and all associated capabilities (including the `create_playlist` one).
7.  **`can` (Post-Revoke)**: If any part of the system were to check for the capability again using the now-invalid `linkId`, `PlatformLink.can(...)` would return `{ ok: false }`, correctly reflecting that the application is no longer authorized to act on the user's behalf.