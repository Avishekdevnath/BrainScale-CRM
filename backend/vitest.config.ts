import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    reporters: ["default"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});

