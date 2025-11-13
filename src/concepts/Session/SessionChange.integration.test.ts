import { Hono } from "jsr:@hono/hono";
import { assert, assertExists } from "jsr:@std/assert";
import SessionConcept from "./SessionConcept.ts";
import { freshID, testDb } from "@utils/database.ts";

Deno.test(
  "POST /api/Session/changeSession returns session id and session is persisted",
  async () => {
    // Create an isolated test DB
    const [db, client] = await testDb();

    try {
      // Prepare a source list in ListCreation to seed session items
      const listId = freshID();
      const taskA = freshID();
      const taskB = freshID();
      const listDoc = {
        _id: listId,
        title: "Integration Test List",
        listItems: [
          { task: taskA, orderNumber: 1 },
          { task: taskB, orderNumber: 2 },
        ],
        itemCount: 2,
      };
      // Cast to any to avoid strict ObjectId typing in tests where freshID() is used
      await db.collection("ListCreation.lists").insertOne(listDoc as any);

      const ownerId = freshID();

      // Build a tiny in-process app that exposes the same endpoint shape
      const app = new Hono();
      const instance = new SessionConcept(db as any);

      app.post("/api/Session/changeSession", async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const sessionOwner = body.sessionOwner ?? body.caller ?? ownerId;
        const res = await instance.changeSession({
          list: body.list,
          sessionOwner,
          ordering: body.ordering,
          format: body.format,
        });
        return c.json(res);
      });

      // Build a request to the in-process app
      const request = new Request(
        "http://localhost/api/Session/changeSession",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ list: listId, sessionOwner: ownerId }),
        },
      );

      const resp = await app.fetch(request);
      const json = await resp.json();

      // The handler should return an object with a session id
      assert(json && typeof json.session === "string");

      // Verify the session exists in the database
      const sessionColl = db.collection("Session.sessions");
      const found = await sessionColl.findOne({ _id: json.session });
      assert(found !== null, "Session document should be persisted in the DB");

      // Also verify it references the intended owner and list
      assert(found!.owner === ownerId);
      assert(found!.listId === listId);
    } finally {
      // Clean up client and test database
      try {
        await client.close();
      } catch (_e) {
        /* best-effort close */
      }
    }
  },
);
