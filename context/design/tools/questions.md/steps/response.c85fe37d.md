---
timestamp: 'Tue Oct 21 2025 18:14:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251021_181430.ed472b02.md]]'
content_id: c85fe37d60a1952c315960d57c9ef81f79fe0d6c9c07e5d997dc0a19165f1ed3
---

# response:

You're encountering the error `JSR package not found: @hono/cors`. This means Deno couldn't locate or download the `cors` middleware from the JSR registry.

Here's how to troubleshoot and fix this:

1. **Update Deno:**
   JSR (Deno's official package registry) is relatively new, and Deno's support for it has improved with recent versions. Ensure your Deno CLI is up-to-date.
   Open your terminal and run:
   ```bash
   deno upgrade
   ```
   After upgrading, try running your server again.

2. **Clear Deno's Module Cache:**
   Sometimes Deno's cache can get corrupted or an incomplete download might be cached. Clearing it will force Deno to re-download all modules, including `@hono/cors`.
   Run this command in your terminal:
   ```bash
   deno cache --reload src/concept/_server.ts
   ```
   This command specifically reloads dependencies for your server file. If you want to clear the entire global cache (more drastic but sometimes necessary), you can use:
   ```bash
   deno cache --reset
   ```
   After clearing the cache, try running your server.

3. **Check Network Connectivity:**
   Ensure your machine has a stable internet connection and can reach `jsr.io` (where JSR packages are hosted). Sometimes corporate proxies or firewalls can interfere with Deno's ability to fetch remote modules.

4. **Verify the Import Path (already looks correct):**
   The import `import { cors } from "jsr:@hono/cors";` is the correct way to import the Hono CORS middleware from JSR. There's no typo there.

### Summary of Steps to Try:

1. **`deno upgrade`**
2. **`deno cache --reload src/concept/_server.ts`** (or `deno cache --reset`)
3. Then, run your server again:
   ```bash
   deno run -A src/concept/_server.ts
   ```
   (Or with more granular permissions if you prefer: `deno run --allow-net --allow-read --allow-env src/concept/_server.ts`)

These steps should resolve the "JSR package not found" error by ensuring Deno is up-to-date and has a clean, fresh download of the required package.
