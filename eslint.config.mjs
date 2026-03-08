import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import typescript from "@vue/eslint-config-typescript";
import prettier from "@vue/eslint-config-prettier";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/dev-dist/**",
      "**/node_modules/**",
      "**/.git/**",
    ],
  },
  js.configs.recommended,
  ...vue.configs["flat/essential"],
  ...typescript(),
  prettier,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.vue"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "vue/multi-word-component-names": "off",
      "vue/no-reserved-component-names": "off",
    },
  },
  {
    files: [".eslintrc.cjs", "server/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        console: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/worker.js"],
    languageOptions: {
      globals: {
        self: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-expressions": "warn",
      "no-case-declarations": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-var": "warn",
      "vue/no-unused-vars": "warn",
    },
  },
];
