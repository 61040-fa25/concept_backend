---
timestamp: 'Tue Oct 28 2025 21:18:16 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251028_211816.a80dce7f.md]]'
content_id: b95b1896c6c15fe6a413ba1492d47dbe89f4f313000179379b87e63167552bf0
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@hono/hono": "jsr:@hono/hono@^4.10.1",
        "@utils/": "./src/utils/"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}

```
