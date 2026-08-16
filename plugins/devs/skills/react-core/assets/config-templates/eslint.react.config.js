// React app ESLint flat config — copy to eslint.config.js at the project root.
// Install: eslint @eslint/js typescript-eslint eslint-plugin-react-hooks
//          @eslint-react/eslint-plugin typescript@6
// (typescript-eslint drives the JS compiler API, so the lint toolchain uses
// typescript 6.x even when the project compiles with tsc 7 — see the
// typescript-core skill's strict-configuration reference.)
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import eslintReact from "@eslint-react/eslint-plugin";

export default tseslint.config(
  { ignores: ["dist/"] },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  eslintReact.configs["recommended-typescript"],
  reactHooks.configs.flat["recommended-latest"],
  // Both plugins implement the hooks rules. This preset turns off the
  // eslint-plugin-react-hooks copies, so hooks diagnostics (rules-of-hooks,
  // exhaustive-deps, set-state-in-effect, ...) surface under the
  // @eslint-react/ namespace — each fires exactly once.
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // `onClick={() => setCount(n)}` is the React idiom; keep the rule for
      // genuinely confusing cases but allow arrow-shorthand handlers.
      "@typescript-eslint/no-confusing-void-expression": [
        "error",
        { ignoreArrowShorthand: true },
      ],
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
);
