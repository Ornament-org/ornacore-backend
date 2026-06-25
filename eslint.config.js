import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "coverage/**", "logs/**", "uploads/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        console: "readonly",
        process: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
  },
  {
    files: ["src/**/*.model.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sequelize",
              importNames: ["Model"],
              message: "Use sequelize.define(...) for every Sequelize model.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "ClassDeclaration",
          message: "Model files must use sequelize.define(...) instead of classes.",
        },
        {
          selector: "CallExpression[callee.property.name='init']",
          message: "Model files must use sequelize.define(...) instead of Model.init(...).",
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        fetch: "readonly",
      },
    },
    rules: {
      "no-console": "off",
    },
  },
];
