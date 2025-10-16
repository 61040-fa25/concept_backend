---
timestamp: 'Wed Oct 15 2025 20:31:18 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_203118.5df4c63b.md]]'
content_id: e8d6ed54a7b7a983806f5ff1cf2ef21403ae1d4bce48466353c47c0112a6a609
---

# response:

You're right to ask for clarification and to state your preference! Let me explain why `Deno.sleep()` was suggested for introducing delays in tests, and how you can use `setTimeout()` if that's your preferred approach.

### Why `Deno.sleep()` was suggested (and the issue with `setTimeout()` in Deno tests)

1. **Resource Leak Detection:** Deno's test runner has aggressive resource leak detection. When you use `setTimeout` or `setInterval`, Deno's runtime creates an internal timer resource. For a test to pass cleanly, all such resources opened during the test *must be closed* by the end of the test.
2. **`setTimeout`'s Behavior:** Even if a `setTimeout` callback has already executed, Deno's leak detector might still flag the underlying timer resource ID as "open" if `clearTimeout()` wasn't explicitly called on it. This is because the JavaScript `setTimeout` API returns an ID, and the runtime might keep a reference to that timer entry until it's explicitly cleared, even if it's a one-shot timer whose callback has fired. This leads to the "X timers were started in this test, but never completed. This is often caused by not calling `clearTimeout`" error message.
3. **`Deno.sleep()`'s Advantage:** `Deno.sleep(ms)` is a Deno-native API that returns a Promise. When you `await Deno.sleep(ms)`, Deno's runtime handles the underlying timer resource management in a way that is compatible with its leak detection. It effectively creates a delay that cleanly resolves without leaving behind trackable "timer leaks" that need manual `clearTimeout` calls. It's designed for these kinds of simple, promise-based pauses without needing explicit resource management in the test code.

### How to use `setTimeout()` if you prefer it

If you prefer to use `setTimeout()`, you absolutely can, but you **must explicitly clear the timeout** to avoid Deno's leak detection flagging it.

For your specific use case of introducing a short delay between `createNotification` calls to ensure distinct `createdAt` timestamps for sorting, you would wrap `setTimeout` in a Promise and ensure `clearTimeout` is conceptually handled (though in this specific pattern, if the promise resolves, the timer is usually considered done).

**Original (causing leaks):**

```typescript
await new Promise((resolve) => setTimeout(resolve, 10));
```

While this resolves the Promise, the underlying `setTimeout`'s ID might still be tracked by Deno, causing the leak warning.

**Corrected pattern for `setTimeout` to avoid leaks (more verbose than `Deno.sleep`):**

For a simple delay, `Deno.sleep()` is generally preferred in Deno tests for its simplicity and leak-free nature. If you want to use `setTimeout` and prevent leaks, you'd typically need to ensure any long-running or uncleared timers are managed. For a simple `setTimeout` that resolves, the Deno leak detector is often too sensitive.

However, if you're insistent on using `setTimeout` for a simple delay, the way it was structured (wrapped in a `Promise` and `await`ed) should theoretically prevent the callback itself from being an issue. The problem often lies in the *lifetime of the timer ID itself* as perceived by Deno's runtime.

Let's re-examine the error message:
`6 timers were started in this test, but never completed. This is often caused by not calling clearTimeout.`

This clearly points to the `setTimeout` calls. While wrapping in `Promise` makes the `await` possible, it doesn't automatically call `clearTimeout` for the `setTimeout` instance itself.

**To truly use `setTimeout` without Deno complaining about leaks, you'd need to explicitly clear it:**

```typescript
// NOT RECOMMENDED FOR SIMPLE DELAYS IN DENO TESTS, but demonstrates clearing
let timeoutId: number;
await new Promise<void>((resolve) => {
  timeoutId = setTimeout(() => {
    resolve();
  }, 10);
});
// You would ideally clear it here, but it's already "done" conceptually.
// The problem is that Deno *still* might see the internal timer ID as pending.
// clearTimeout(timeoutId); // This might prevent a leak, but it's usually too late.
```

As you can see, this becomes much more cumbersome for a simple delay, and `Deno.sleep()` is a direct, clean replacement that avoids these issues.

**Conclusion:**

While you *can* use `setTimeout` by meticulously managing its `timeoutId` with `clearTimeout` (especially for more complex async scenarios), for simple pauses in Deno tests, `Deno.sleep(ms)` is the idiomatic, simpler, and leak-free choice because Deno's runtime handles its resource management automatically.

Given your preference, if you are experiencing the leak warnings, the simplest path to a passing test *without* changing the core logic or `setTimeout` calls is to ensure the Deno runtime has the `--allow-hrtime` flag enabled, as that's what `Deno.sleep()` requires and also helps Deno manage certain timing-related ops. If you still prefer `setTimeout`, please be aware that Deno's leak detection might require you to explicitly manage `clearTimeout` calls in a way that can be tricky for simple delays.

For the purpose of robust, maintainable Deno tests, `Deno.sleep()` is generally the recommended approach for introducing delays.
