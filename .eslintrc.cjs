module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true
  },
  extends: [
    "eslint:recommended"
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    }
  },
  ignorePatterns: [
    "dist/",
    "RailResolve-frontend/dist/",
    "node_modules/"
  ],
  rules: {
    "no-unused-vars": "warn"
  }
};
