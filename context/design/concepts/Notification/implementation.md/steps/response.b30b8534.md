---
timestamp: 'Wed Oct 15 2025 19:56:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251015_195621.e293b831.md]]'
content_id: b30b853410ba0b545977e3ca5c64a9c645564d493ad5dfd930eeaa875ebeff8c
---

# response:

Yes, you are correct. In modern TypeScript (especially with `tsconfig.json`'s `useUnknownInCatchVariables` set to `true`, which is the default in newer versions), `e` in a `catch (e)` block is typed as `unknown`. This prevents direct access to properties like `e.message` without type narrowing, causing a TypeScript error.

To fix this, you should check if `e` is an `Error` instance before accessing `e.message`:

```typescript
// Original:
// } catch (e) {
//   console.error("Error creating notification:", e);
//   return { error: `Failed to create notification: ${e.message}` }; // TS error here
// }

// Corrected:
} catch (e) {
  let errorMessage = "An unknown error occurred.";
  if (e instanceof Error) {
    errorMessage = e.message;
  } else if (typeof e === 'string') {
    errorMessage = e;
  }
  console.error("Error creating notification:", e);
  return { error: `Failed to create notification: ${errorMessage}` };
}
```

This pattern ensures that `e.message` is only accessed when TypeScript can confirm `e` is an `Error` object, satisfying type-checking requirements.
