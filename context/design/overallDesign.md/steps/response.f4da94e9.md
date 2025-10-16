---
timestamp: 'Wed Oct 15 2025 20:59:58 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_205958.4fb5daea.md]]'
content_id: f4da94e9fa91ed979d18822dedc6aa78a17ee46e79551d29072f7598c71482ed
---

# response:

The `TypeError: Deno.sleep is not a function` error means that the Deno runtime is not given the necessary permission to use `Deno.sleep()`. This function requires the `--allow-hrtime` flag.

It appears the solution provided in a previous turn (adding `--allow-hrtime` to your Deno test command) has not yet been applied.

**Problem:** You are still encountering `TypeError: Deno.sleep is not a function`.

**Reason:** `Deno.sleep()` requires the `--allow-hrtime` permission, which is not being provided to the Deno runtime when you execute your tests.

**Solution:** You need to add the `--allow-hrtime` flag to your Deno test command.

**If you are running from the command line directly:**
Change your command from:
`deno test -A src/concepts/Notification/NotificationConcept.test.ts`
to:
`deno test -A --allow-hrtime src/concepts/Notification/NotificationConcept.test.ts`

**If you are using `deno.json` tasks:**
Update your `deno.json` file's `tasks` section (if you have one) to include `--allow-hrtime`. For example:

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

Then run your tests using: `deno task test src/concepts/Notification/NotificationConcept.test.ts`

Once this permission is granted, the `Deno.sleep` function will be available, and the `TypeError` should be resolved. The test code, with `Deno.sleep` replacing `setTimeout`, is otherwise correct for addressing the leak detection issues.
