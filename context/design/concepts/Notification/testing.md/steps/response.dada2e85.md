---
timestamp: 'Wed Oct 15 2025 20:29:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_202955.b203e190.md]]'
content_id: dada2e855a37cfda359586fe895d3f22740a4501492278e6e24599c7b2670ded
---

# response:

You are absolutely correct! My apologies for overlooking the Deno permissions required for `Deno.sleep()`.

The `TypeError: Deno.sleep is not a function` error indicates that the Deno runtime does not have the necessary permission to execute `Deno.sleep()`. `Deno.sleep()` requires the `--allow-hrtime` permission.

To resolve this, you need to add `--allow-hrtime` to your Deno test command.

**Problem:** `Deno.sleep is not a function` because `--allow-hrtime` permission is missing.

**Solution:** Update your Deno test command to include `--allow-hrtime`.

If you're running your tests directly, modify your command from something like:
`deno test -A src/concepts/Notification/NotificationConcept.test.ts`
to:
`deno test -A --allow-hrtime src/concepts/Notification/NotificationConcept.test.ts`

If you have a `deno.json` with a `tasks` section, you might update it like this (assuming `tasks.test` is how you run tests):

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api",
        "test": "deno test --allow-net --allow-read --allow-sys --allow-env --allow-hrtime"
    }
}
```

Then you would run `deno task test src/concepts/Notification/NotificationConcept.test.ts`.

Applying this permission should resolve the `TypeError` and allow your tests to run without that specific error. The rest of the test logic, including the use of `Deno.sleep` instead of `setTimeout`, is sound for addressing the leak warnings previously mentioned.
