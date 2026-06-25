export default {
  testEnvironment: "node",
  watchman: false,
  transform: {},
  roots: ["<rootDir>/tests"],
  setupFiles: ["<rootDir>/tests/setup-env.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
    "!src/database/migrations/**",
    "!src/database/seeders/**",
  ],
  coverageDirectory: "coverage",
  clearMocks: true,
  restoreMocks: true,
};
