import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Mirror the `@/*` alias from tsconfig.json so tests can import
// from anywhere in src without relative-path soup. Existing tests
// that use ../foo continue to work — this just adds support for
// the alias used by the source files they import.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
