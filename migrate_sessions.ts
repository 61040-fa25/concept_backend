import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";

const MONGO_URI = Deno.env.get("MONGODB_URL");
const DB_NAME = Deno.env.get("DB_NAME");

if (!MONGO_URI || !DB_NAME) {
  throw new Error("Missing MONGODB_URL or DB_NAME environment variables");
}

async function migrateSessions() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected successfully");

    const db = client.db(DB_NAME);
    const sessionsCollection = db.collection("RoutineLog.sessions");

    // Update all sessions without isDone field to have isDone=true
    const result = await sessionsCollection.updateMany(
      { isDone: { $exists: false } },
      { $set: { isDone: true } }
    );

    console.log(`✅ Migration complete: Updated ${result.modifiedCount} sessions`);
    console.log(`   Matched ${result.matchedCount} sessions`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await client.close();
    console.log("Connection closed");
  }
}

migrateSessions();
