import "jsr:@std/dotenv/load";
import { MongoClient } from "npm:mongodb";

async function clearData() {
  const DB_CONN = Deno.env.get("MONGODB_URL");
  const DB_NAME = Deno.env.get("DB_NAME");

  if (!DB_CONN || !DB_NAME) {
    throw new Error("Missing MONGODB_URL or DB_NAME environment variables");
  }

  const client = new MongoClient(DB_CONN);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(DB_NAME);

    // Clear TaskCatalog collections
    const taskCatalogResult = await db.collection("TaskCatalog.tasks").deleteMany({});
    console.log(`Deleted ${taskCatalogResult.deletedCount} documents from TaskCatalog.tasks`);

    // Clear ScheduleTime collections
    const scheduleTimeResult = await db.collection("ScheduleTime.timeBlocks").deleteMany({});
    console.log(`Deleted ${scheduleTimeResult.deletedCount} documents from ScheduleTime.timeBlocks`);

    // Clear RoutineLog collections
    const routineLogResult = await db.collection("RoutineLog.sessions").deleteMany({});
    console.log(`Deleted ${routineLogResult.deletedCount} documents from RoutineLog.sessions`);

    console.log("\nAll data cleared successfully!");

  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

clearData();
