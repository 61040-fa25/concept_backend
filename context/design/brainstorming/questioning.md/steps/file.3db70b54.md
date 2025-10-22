---
timestamp: 'Tue Oct 21 2025 19:02:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_190211.d9c5784a.md]]'
content_id: 3db70b548b1778eff66fae49e45a8f9ce75bfe77db2d19743d9a1a40339ca1fa
---

# file: deno.json

```json
{
  "importMap": "./import_map.json",
  "tasks": {

"concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"

},

"lint": {

"rules": {

"exclude": ["no-import-prefix", "no-unversioned-import"]

}

}

}

```
