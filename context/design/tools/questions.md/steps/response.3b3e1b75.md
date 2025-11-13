---
timestamp: 'Tue Oct 21 2025 18:08:39 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_180839.1a0ebac4.md]]'
content_id: 3b3e1b75c48864bb3d099f88d79b341660630c550f865d2a920f8e026202365f
---

# response:

To allow requests from `localhost:8001` (or any other origin) to your Hono server running on `localhost:8000`, you need to enable Cross-Origin Resource Sharing (CORS).

Hono provides a convenient CORS middleware for this.

Here's how you can modify your `src\concept\_server.ts` file:

1. **Import the `cors` middleware:** Add `import { cors } from "jsr:@hono/cors";`
2. **Use the `cors` middleware:** Apply it globally to your `app` instance with `app.use(cors({ /* options */ }))`.

## Modified `src\concept\_server.ts`

```typescript
import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/cors"; // NEW: Import CORS middleware
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";

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
  const [db] = await getDb();
  const app = new Hono();

  // NEW: Enable CORS
  app.use(
    cors({
      origin: "http://localhost:8001", // <--- Specify the allowed origin
      credentials: true, // Set to true if your client sends cookies or authorization headers
      allowMethods: ["POST", "GET", "OPTIONS"], // Explicitly allow methods you use
      allowHeaders: ["Content-Type", "Authorization"], // Explicitly allow headers your client might send
    }),
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
    entry.path = entry.path.replace('\\', '/');
    console.log(`entry.path: ${entry.path}, CONCEPTS_DIR: ${CONCEPTS_DIR}`)
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

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
        // console.log(route)

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
```

### Explanation of CORS Options:

* **`origin: "http://localhost:8001"`**: This is the most important part. It tells browsers that requests coming from `http://localhost:8001` are allowed to access this server.
  * If you need to allow multiple specific origins, you can provide an array: `origin: ["http://localhost:8001", "http://another-client.com"]`.
  * If you want to allow *any* origin (be cautious with this in production, as it can be a security risk), you can use `origin: "*"`.
* **`credentials: true`**: Set this to `true` if your client-side application sends credentials like cookies, HTTP authentication, or TLS client certificates with its requests. If you don't use these, you can omit it or set it to `false`.
* **`allowMethods: ["POST", "GET", "OPTIONS"]`**: This specifies which HTTP methods are allowed for cross-origin requests. Since your server primarily uses `POST` routes and has a `GET` root, `POST` and `GET` are essential. `OPTIONS` is needed for "preflight requests" that browsers automatically send before certain complex HTTP requests (like `POST` with a `Content-Type` other than `application/x-www-form-urlencoded`, `multipart/form-data`, or `text/plain`).
* **`allowHeaders: ["Content-Type", "Authorization"]`**: This specifies which headers are allowed in cross-origin requests. `Content-Type` is very common, especially for JSON bodies. If your client sends an `Authorization` header (e.g., for JWTs or API keys), you must include it here.

### Running Your Server

You'll need to grant the necessary Deno permissions:

```bash
deno run -A src/concept/_server.ts
```

Or, with more specific permissions:

```bash
deno run --allow-net --allow-read --allow-env src/concept/_server.ts
```

Now, any client-side application (e.g., a React app, a simple HTML file with Fetch API) running on `http://localhost:8001` will be able to make `POST` requests to your Hono server on `http://localhost:8000` without triggering CORS errors in the browser.
