module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
    es2021: true,
    browser: true,
  },
  globals: {
    __DEV__: 'readonly',
    NodeJS: 'readonly',
    JSX: 'readonly',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    'no-undef': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['backend/generated/**', 'backend/dist/**'],
};
