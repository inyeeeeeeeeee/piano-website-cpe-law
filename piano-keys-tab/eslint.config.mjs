import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Flat ESLint config (ESLint 10).
 *
 * • `eslint-config-next/core-web-vitals` — React, hooks, JSX a11y and the
 *   Next.js rules (no `next/script` misuse, no unescaped HTML, etc.).
 * • `eslint-config-next/typescript` — typescript-eslint recommended rules.
 * • Generated output and build artefacts are ignored outright.
 */
export default defineConfig([
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "generated/**",
    "next-env.d.ts",
    "*.tsbuildinfo",
  ]),
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler-era rules (purity / immutability / setState-in-effect /
      // refs) are still advisory: they flag several patterns that are correct
      // in React 19 + Next.js (hydration mount-guards, syncing state to props,
      // full page navigation after a credential round-trip). Keep them visible
      // as warnings without failing the build.
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
    },
  },
]);
