import { freshID, testDb } from "./src/utils/database.ts";
import SessionConcept from "./src/concepts/Session/SessionConcept.ts";

(async function () {
  const [db, client] = await testDb();
  const sessionConcept = new SessionConcept(db);
  const USER_ALICE = "user:Alice";
  const LIST_GROCERIES = "list:Groceries";

  console.log("Creating session...");
  await sessionConcept.changeSession({
    list: LIST_GROCERIES,
    sessionOwner: USER_ALICE,
  });
  const session = await sessionConcept._getSessionForOwner({
    owner: USER_ALICE,
  });
  console.log("Session fetched by helper:", session);

  const raw = await db.collection("Session.sessions").find().toArray();
  console.log("Raw sessions collection:", raw);

  await client.close();
})();
