---
timestamp: 'Wed Oct 15 2025 20:22:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_202204.007473f8.md]]'
content_id: d4c8174bed5a4ec945b9325ae6510dec16860712404b3acee1d6499a78a0536e
---

# response:

The leaks detected (timers, async calls, TLS connection) are primarily due to the asynchronous operations, especially the `setTimeout` calls, not being properly handled within the Deno test environment.

The most straightforward fix is to replace `setTimeout` with `Deno.sleep()` for simple delays. `Deno.sleep()` is a non-blocking asynchronous function that handles timers internally without exposing them for manual clearing, which is safer and idiomatic in Deno tests. This will address the "6 timers were started... but never completed" error.

The `op_read` and TLS connection leaks are likely related to the MongoDB client. While `client.close()` is called at the end of the `Deno.test` block, replacing `setTimeout` might also help resolve some related pending I/O operations.

Here are the updated files:
