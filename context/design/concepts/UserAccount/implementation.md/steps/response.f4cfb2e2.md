---
timestamp: 'Sun Oct 19 2025 22:55:10 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_225510.0ec8dde4.md]]'
content_id: f4cfb2e2ff3f281d3358b7dd98bb09920271a900b471266fee60045e38bb05be
---

# response:

The error message `Inline 'npm:', 'jsr:' or 'https:' dependency not allowed. Add it as a dependency in a deno.json or package.json instead and reference it here via its bare specifier` indicates that Deno's dependency management has evolved. You can no longer directly import from `https://deno.land/std/...` without explicitly mapping it in your `deno.json` file or using a bare specifier if configured.

The recommended approach for Deno's `std` library is to define it in `deno.json` under `imports` (or `scopes` for more granular control) and then import it using a bare specifier.

Here's how to fix it:
