const js = require("@eslint/js");
const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  {
    ignores: [
        "**/node_modules/",
        "**/.expo/",
        "**/android/",
        "**/ios/",
        "**/dist/",
        "**/backend/dist/",
        "**/backend/generated/",
        "**/backend/node_modules/",
        "**/*.json",
        "**/google-services.json",
        "**/GoogleService-Info.plist",
    ]
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2021,
        sourceType: "module",
        globals: {
            ...globals.browser,
            ...globals.node,
            ...globals.jest,
            __DEV__: "readonly",
            NodeJS: "readonly",
            JSX: "readonly",
        }
    },
    plugins: {
        "@typescript-eslint": tsPlugin,
    },
    rules: {
        ...tsPlugin.configs.recommended.rules,
        ...prettierConfig.rules,
        
        // Overrides
        "@typescript-eslint/no-unused-vars": "warn",
        "no-console": "off",
        "@typescript-eslint/no-require-imports": "off",
        "no-undef": "error",
        "@typescript-eslint/no-explicit-any": "warn",
        "no-unused-vars": "off"
    }
  }
];
