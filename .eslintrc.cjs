module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  plugins: ["@typescript-eslint", "import", "prettier"],
  rules: {
    "import/order": [
      "error",
      {
        "newlines-between": "always",
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
      },
    ],
    quotes: ["error", "single"],
    semi: ["error", "always"],
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "prettier/prettier": ["error", { "endOfLine": "auto" }],
    "@typescript-eslint/no-empty-interface": "off",
    "no-unused-expressions": "warn",
    "no-unused-vars": "warn",
    "no-useless-computed-key": "off",
    "@typescript-eslint/ban-ts-comment": "off"
  },
  settings: {
    "import/resolver": {
      typescript: {},
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
};
