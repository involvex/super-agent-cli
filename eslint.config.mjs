import typescriptEslint from "typescript-eslint";

export default [
  {
    ignores: [
      "dist",
      "@plugins/examples/*/dist/*",
      "@plugins/templates/*/dist/*",
      "@plugins/examples/*/dist/*.js",
      "@plugins/templates/*/dist/*.js",
      "@plugins/examples/*/dist/*.js.map",
      "@plugins/templates/*/dist/*.js.map",
      "vscode-extension/dist/**",
    ],
  },
  {
    files: ["**/*.ts"],
  },
  {
    plugins: {
      "@typescript-eslint": typescriptEslint.plugin,
    },

    languageOptions: {
      parser: typescriptEslint.parser,
      ecmaVersion: 2022,
      sourceType: "module",
    },

    rules: {
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],

      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "warn",
    },
  },
];
