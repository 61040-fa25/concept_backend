---
timestamp: 'Wed Oct 15 2025 20:24:29 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_202429.165659a2.md]]'
content_id: 0dcb69c6f2faadd66a1ef3c9923df6e5a99d0da6bbb314caae0951dfe1233e69
---

# response:

It seems we're dealing with persistent leak detection in Deno's test runner, specifically related to the asynchronous nature of the MongoDB client's connection management, even when `client.close()` is called. The phrase "test 2 caused the following errors" likely means that the leaks were *detected* or accumulated enough to be reported during or after the execution of test 2, rather than test 2 itself having a direct logical flaw.

The `op_read` and `TLS connection` leaks often point to network resources (like MongoDB connections) that Deno perceives as still open when the test suite finishes. Although `client.close()` is awaited, the underlying network connections might not be immediately torn down, or Deno's leak detector might run slightly before the client has fully flushed and closed everything.

A common workaround for this specific scenario in Deno tests, especially with database clients, is to introduce a small, non-blocking delay before `client.close()`. This gives the MongoDB driver a moment to cleanly shut down its internal connections.

I will apply this minimal, heuristic fix to the `client.close()` calls in your test file, while keeping the rest of the code (which already addresses the `setTimeout` and `e.message` issues) unchanged, as it adheres to the latest concept specification and testing principles.
