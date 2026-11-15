import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import importX from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.next/**",
      "apps/web/out/**",
      "**/.turbo/**",
      "**/storybook-static/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "apps/web/next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  { ...jsxA11y.flatConfigs.recommended, files: ["packages/ui/**/*.{ts,tsx}"] },
  ...[...nextVitals, ...nextTypescript].map((config) => ({
    ...config,
    files: ["apps/web/**/*.{ts,tsx}"],
  })),
  { files: ["apps/web/**/*.{ts,tsx}"], settings: { next: { rootDir: "apps/web/" } } },
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "scripts/*.mjs"],
    plugins: { "import-x": importX },
    rules: {
      "import-x/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal", "parent", "sibling", "index", "type"],
        },
      ],
    },
  },
  {
    files: ["packages/rules/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["node:*", "fs", "path", "http", "https", "child_process", "@supabase/*"] },
      ],
      "no-restricted-globals": [
        "error",
        "fetch",
        "localStorage",
        "sessionStorage",
        "process",
        "Deno",
        "Bun",
        "setTimeout",
        "setInterval",
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "Supply an explicit instant; rules cannot read the ambient clock.",
        },
        {
          selector: "CallExpression[callee.name='Date'][arguments.length=0]",
          message: "Supply explicit time.",
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now" },
        { object: "Math", property: "random" },
        { object: "crypto", property: "randomUUID" },
      ],
    },
  },
];
