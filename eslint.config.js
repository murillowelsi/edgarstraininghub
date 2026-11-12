import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import i18next from "eslint-plugin-i18next";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Hardcoded UI text must go through src/translations (LanguageContext `t`).
  // "warn" for now so it doesn't block the lint; raise to "error" once at zero.
  {
    files: ["src/**/*.tsx"],
    ignores: [
      "src/components/ui/**",
      "src/**/*.test.tsx",
      // Dead code slated for removal (plan.md, risk 8): no route or no import
      "src/pages/admin/Subscriptions.tsx",
      "src/pages/admin/UserForm.tsx",
      "src/components/workout/StageCard.tsx",
    ],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "warn",
        {
          // Text between JSX tags. "jsx-only" also flags every string inside JSX
          // expressions (keys, colours, format patterns): too noisy to be useful.
          mode: "jsx-text-only",
          words: {
            exclude: [
              // Defaults: punctuation/digits, ALL-CAPS tokens (PR, EZ, W)
              "[0-9!-/:-@[-`{-~]+",
              "[A-Z_-]+",
              // No letters at all: separators, numbers, symbols (· — × “ ” ✓ 🏆 −15)
              /^[^\p{L}]*$/u,
              // Brand, people and product names
              "Edgar Zanin",
              "EZ Training Hub",
              "WhatsApp",
              "YouTube",
              "Instagram",
              "Facebook",
              "Blog",
              "Chat",
              "Menu",
              "Slug",
              // Language names are shown in their own language
              "English",
              "Português",
              // Units and input masks
              "kg",
              "kg ×",
              "km",
              "km/h",
              "mi",
              "m",
              "min",
              "s",
              "bpm",
              "\\(bpm\\)",
              "\\(W\\)",
              "/blog/",
              "Edgar Zanin\\.",
              "\\(h:mm:ss\\)",
              "HH:MM:SS",
              "you@example\\.com",
            ],
          },
        },
      ],
    },
  }
);
