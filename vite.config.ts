// Use Deno's npm: import specifiers so the config can be type-checked by Deno.
import { defineConfig } from "npm:vite";
import vue from "npm:@vitejs/plugin-vue";

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
