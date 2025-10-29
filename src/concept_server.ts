import { Hono } from "jsr:@hono/hono";
import { getDb } from "@utils/database.ts";
import { usernameToUserId } from "@utils/users.ts";
import { ID } from "@utils/types.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";
import { basename } from "jsr:@std/path";
import { cors } from "@hono/cors";
// import { cors } from "https://deno.land/x/hono/middleware/cors/index.ts";

// Parse command-line arguments for port and base URL
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: "8000",
    baseUrl: "/api",
  },
});

const PORT = parseInt(flags.port, 10);
const BASE_URL = flags.baseUrl;
const CONCEPTS_DIR = "src/concepts";

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  const [db, client] = await getDb();
  // Narrow types for clarity with the MongoDB driver
  const dbInstance = db as unknown as import("npm:mongodb").Db;
  const mongoClient = client as unknown as import("npm:mongodb").MongoClient;

  const app = new Hono();

  app.use(
    cors({
      origin: "http://localhost:5173",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
      credentials: true,
    }) as any,
  );

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (basename(entry.path) === basename(CONCEPTS_DIR)) continue; // Skip the root directory

    const conceptName = entry.name;
    const conceptFilePath = `${entry.path}/${conceptName}Concept.ts`;

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      const instance = new ConceptClass(db);
      const conceptApiName = conceptName;
      console.log(
        `- Registering concept: ${conceptName} at ${BASE_URL}/${conceptApiName}`,
      );

      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      )
        .filter((name) =>
          name !== "constructor" && typeof instance[name] === "function"
        );

      for (const methodName of methodNames) {
        const actionName = methodName;
        const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

        // Special-case TaskBank dependency mutations to validate caller and use transactions
        if (
          conceptApiName === "TaskBank" &&
          (methodName === "addDependency" || methodName === "deleteDependency")
        ) {
          app.post(route, async (c) => {
            try {
              const body = await c.req.json().catch(() => ({}));

              // Resolve caller: prefer explicit auth headers, then fall back to body-supplied id
              // Header precedence: x-auth-userid, x-auth-username
              const headerUserId = c.req.header("x-auth-userid");
              const headerUsername = c.req.header("x-auth-username");

              // Resolve caller id (prefer headers, then body fields)
              let callerId: ID | null = null;
              if (headerUserId) callerId = headerUserId as unknown as ID;
              else if (body.adder) callerId = body.adder as ID;
              else if (body.deleter) callerId = body.deleter as ID;
              else if (body.caller) callerId = body.caller as ID;

              if (!callerId && headerUsername) {
                const resolved = await usernameToUserId(
                  dbInstance,
                  headerUsername,
                );
                if (resolved) callerId = resolved;
              }

              if (!callerId) {
                return c.json({
                  error: "Caller not authenticated or specified.",
                }, 401);
              }

              // Start a client session for an atomic transaction
              const session = mongoClient.startSession();
              let handlerResult: unknown = null;
              try {
                await session.withTransaction(async () => {
                  if (methodName === "addDependency") {
                    const adder = callerId as ID;
                    const { task1, task2, dependency } = body;
                    handlerResult = await instance.addDependency({
                      adder,
                      task1,
                      task2,
                      dependency,
                      clientSession: session,
                    });
                  } else {
                    const deleter = callerId as ID;
                    const { sourceTask, targetTask, relation } = body;
                    handlerResult = await instance.deleteDependency({
                      deleter,
                      sourceTask,
                      targetTask,
                      relation,
                      clientSession: session,
                    });
                  }
                });
              } finally {
                await session.endSession();
              }

              // If the handler returned an object with an 'error' property, treat it as a client error
              if (
                handlerResult && typeof handlerResult === "object" &&
                "error" in handlerResult
              ) {
                return c.json(handlerResult as Record<string, unknown>, 400);
              }
              return c.json(
                handlerResult as Record<string, unknown> ?? {},
                200,
              );
            } catch (e) {
              console.error(`Error in ${conceptName}.${methodName}:`, e);
              return c.json(
                { error: "An internal server error occurred." },
                500,
              );
            }
          });
          console.log(`  - Endpoint: POST ${route} (transactional wrapper)`);
          continue; // skip default registration
        }

        // Default registration for other concept methods
        app.post(route, async (c) => {
          try {
            const body = await c.req.json().catch(() => ({})); // Handle empty body
            const result = await instance[methodName](body);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptName}.${methodName}:`, e);
            return c.json({ error: "An internal server error occurred." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

// Run the server
main();
