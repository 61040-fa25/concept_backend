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

  // Basic request logging + CORS helper for browser preflight handling.
  // This middleware logs incoming requests and ensures the server always
  // responds with the appropriate CORS headers for browser clients.
  app.use("*", async (c, next) => {
    try {
      console.debug("[server] incoming", c.req.method, c.req.url);
      // Also print incoming headers to help diagnose missing auth or CORS headers
      try {
        // Extract raw Headers and copy into a plain object for safe logging
        const headersObj: Record<string, string> = {};
        const rawHeaders = (c.req as any)?.raw?.headers ??
          (c.req as any)?.headers;
        if (rawHeaders && typeof rawHeaders[Symbol.iterator] === "function") {
          for (const [k, v] of rawHeaders as Iterable<[string, string]>) {
            headersObj[k] = v;
          }
        }
        console.debug("[server] headers:", headersObj);
      } catch {
        // best-effort header logging
      }
    } catch {
      // best-effort logging
    }
    // Add CORS headers that match the allowed origin used in the project.
    // We set them before calling `next()` and again after to be defensive so
    // even error or early-return responses include the headers.
    const setCorsHeaders = () => {
      c.header("Access-Control-Allow-Origin", "http://localhost:5173");
      c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      c.header(
        "Access-Control-Allow-Headers",
        "Content-Type,Authorization,X-Auth-UserId,X-Auth-Username",
      );
      // When the frontend sends credentials: 'include' the server must return
      // Access-Control-Allow-Credentials: true (string value "true").
      c.header("Access-Control-Allow-Credentials", "true");
    };

    setCorsHeaders();
    try {
      await next();
    } catch (err) {
      // Ensure CORS headers are present on error responses too.
      setCorsHeaders();
      throw err;
    } finally {
      // Also set headers after the handler runs to cover cases where a handler
      // returned a Response directly without using c.json/c.text.
      setCorsHeaders();
    }
  });

  // Respond to preflight requests immediately with no body and a 204.
  app.options("*", (c) => {
    // Return an empty 204 response for preflight and include explicit CORS headers.
    // Return a Response that explicitly includes the CORS headers. Using a
    // raw Response ensures the headers are present even if middleware ordering
    // varies in practice (defensive setup).
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:5173",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type,Authorization,X-Auth-UserId,X-Auth-Username",
      },
    });
  });

  // Create helpful indexes for sessions & listItems. If running against a
  // standalone Mongo instance that doesn't support some index options, this
  // will warn but not block server start.
  try {
    await dbInstance.collection("Session.sessions").createIndex(
      { owner: 1 },
      { unique: true, partialFilterExpression: { active: true } },
    );
    await dbInstance.collection("Session.listItems").createIndex({
      sessionId: 1,
    });
    await dbInstance.collection("Session.listItems").createIndex({
      sessionId: 1,
      defaultOrder: 1,
    });
    console.log("Created/ensured session indexes.");
  } catch (e) {
    console.warn("Warning: could not create some session indexes:", e);
  }

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

        // Special-case Session.changeSession to run inside a DB transaction and return session id
        if (conceptApiName === "Session" && methodName === "changeSession") {
          app.post(route, async (c) => {
            // Prefer canonical identity from auth middleware when available.
            let body: any = {};
            let callerId: ID | null = null;
            let handlerResult: unknown = null;
            let createdSessionId: ID | null = null;
            try {
              body = await c.req.json().catch(() => ({}));

              // Log incoming request body for debugging frontend/network issues
              console.debug(
                "[server] POST /api/Session/changeSession body:",
                body,
              );

              // Try to read authenticated user from middleware state
              const stateUser = (c as any)?.get?.("user") ??
                (c as any)?.req?.ctx?.state?.user;

              const headerUserId = c.req.header("x-auth-userid");
              const headerUsername = c.req.header("x-auth-username");

              let callerId: ID | null = null;
              if (stateUser) {
                if (typeof stateUser === "string") callerId = stateUser as ID;
                else if (stateUser.id) callerId = stateUser.id as ID;
                else if (stateUser.username) {
                  const resolved = await usernameToUserId(
                    dbInstance,
                    stateUser.username,
                  );
                  if (resolved) callerId = resolved;
                }
              }

              if (!callerId && headerUserId) {
                callerId = headerUserId as unknown as ID;
              } else if (!callerId && body.sessionOwner) {
                callerId = body.sessionOwner as ID;
              } else if (!callerId && body.caller) callerId = body.caller as ID;

              if (!callerId && headerUsername) {
                const resolved = await usernameToUserId(
                  dbInstance,
                  headerUsername,
                );
                if (resolved) callerId = resolved;
              }

              // Log resolved caller so frontend/auth mismatch is obvious
              console.debug("[server] resolved caller:", callerId);

              // If the client sent a sessionOwner value, warn if it doesn't match
              // the authenticated caller and always prefer the authenticated id.
              if (
                body && body.sessionOwner &&
                String(body.sessionOwner) !== String(callerId)
              ) {
                console.warn(
                  `[server] Ignoring client-supplied sessionOwner=${body.sessionOwner}; using authenticated caller=${callerId}`,
                );
              }

              if (!callerId) {
                return c.json({
                  error: "Caller not authenticated or specified.",
                }, 401);
              }

              const list = body.list;

              // Start a client session for an atomic transaction if possible
              const session = mongoClient.startSession();
              let handlerResult: unknown = null;
              let createdSessionId: ID | null = null;

              try {
                try {
                  await session.withTransaction(async () => {
                    handlerResult = await instance.changeSession({
                      list,
                      sessionOwner: callerId as ID,
                      ordering: body.ordering,
                      format: body.format,
                      clientSession:
                        session as unknown as import("npm:mongodb").ClientSession,
                    });

                    // If the handler indicated a client error, throw sentinel to abort transaction
                    if (
                      handlerResult && typeof handlerResult === "object" &&
                      "error" in handlerResult
                    ) {
                      throw new Error("ClientError");
                    }

                    if (
                      handlerResult && typeof handlerResult === "object" &&
                      "session" in handlerResult
                    ) {
                      const hr = handlerResult as { session?: unknown };
                      createdSessionId = hr.session as ID ?? null;
                    } else {
                      const sessionColl = dbInstance.collection(
                        "Session.sessions",
                      );
                      const found = await sessionColl.findOne(
                        { owner: callerId, listId: list },
                        { session, sort: { _id: -1 } },
                      );
                      if (found) {
                        createdSessionId = (found._id as unknown) as ID;
                      }
                    }
                  });
                } catch (txErr) {
                  // If transaction failed due to unsupported transactions or other server issues,
                  // log and fall back to non-transactional execution.
                  console.warn(
                    "Transaction failed for changeSession, falling back to non-transactional call:",
                    txErr,
                  );

                  try {
                    // Call the handler without passing a ClientSession so it performs non-transactional writes.
                    handlerResult = await instance.changeSession({
                      list,
                      sessionOwner: callerId as ID,
                      ordering: body.ordering,
                      format: body.format,
                    });

                    if (
                      handlerResult && typeof handlerResult === "object" &&
                      "session" in handlerResult
                    ) {
                      createdSessionId =
                        (handlerResult as { session?: unknown })
                          .session as ID ?? null;
                    }
                  } catch (handlerErr) {
                    console.error(
                      "Non-transactional changeSession also failed:",
                      handlerErr,
                    );
                    throw handlerErr;
                  }
                }
              } finally {
                await session.endSession();
              }

              // Log what happened for debugging
              console.debug(
                "[server] sessionConcept.changeSession result:",
                handlerResult,
              );
              console.debug(
                "POST /api/Session/changeSession - handlerResult:",
                handlerResult,
                "createdSessionId:",
                createdSessionId,
              );

              if (
                handlerResult && typeof handlerResult === "object" &&
                "error" in handlerResult
              ) {
                return c.json(handlerResult as Record<string, unknown>, 400);
              }

              return c.json({
                session: createdSessionId ? String(createdSessionId) : null,
              }, 200);
            } catch (e) {
              // Distinguish client-thrown sentinel from real errors; prefer returning
              // the handlerResult's error if available.
              if ((e as Error)?.message === "ClientError") {
                // If the handlerResult already carries the error, return it.
                // Otherwise, attempt to call changeSession outside a transaction to
                // obtain the error object for the client.
                if (
                  handlerResult && typeof handlerResult === "object" &&
                  "error" in handlerResult
                ) {
                  return c.json(handlerResult as Record<string, unknown>, 400);
                }
                try {
                  if (!callerId) {
                    return c.json({
                      error: "Client error during session creation.",
                    }, 400);
                  }
                  const retry = await instance.changeSession({
                    list: (body as Record<string, unknown>)
                      .list as unknown as ID,
                    sessionOwner: callerId as ID,
                  });
                  return c.json(retry as Record<string, unknown>, 400);
                } catch (_err) {
                  return c.json({
                    error: "Client error during session creation.",
                  }, 400);
                }
              }
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
