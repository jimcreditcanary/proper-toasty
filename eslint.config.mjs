import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build-time + ops scripts. CommonJS, occasional `any` for
    // ad-hoc data work, no React. Not part of the app bundle, no
    // user-facing risk — lint rules tuned for app code aren't
    // helpful here. The scripts still get typechecked via tsc
    // because they sit in the same tsconfig, so we keep that
    // safety net.
    "scripts/**",
    "supabase/**",
  ]),
]);

export default eslintConfig;
