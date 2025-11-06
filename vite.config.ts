// Work cross-platform: in Deno use `npm:` specifiers (so Deno can type-check),
// and in Node/Vite use regular package imports. We use conditional dynamic
// imports with top-level await so the same file works in both environments.
const isDeno = typeof Deno !== "undefined";

const vitePkg = isDeno ? await import("npm:vite") : await import("vite");
const pluginVuePkg = isDeno
  ? await import("npm:@vitejs/plugin-vue")
  : await import("@vitejs/plugin-vue");

// deno-lint-ignore no-explicit-any
const { defineConfig } = vitePkg as any;
// plugin module may export default or be the function itself depending on loader
// deno-lint-ignore no-explicit-any
const vue = (pluginVuePkg as any).default ?? pluginVuePkg;

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
