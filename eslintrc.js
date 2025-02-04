module.exports = {
  parser: "@babel/eslint-parser", // Ensure this is a string, not a function
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ["eslint:recommended", "plugin:react/recommended"],
  plugins: ["react"],
  rules: {
    // Add custom ESLint rules here
  },
};