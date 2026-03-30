import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
});
