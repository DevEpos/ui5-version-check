import { Config } from "jest";

const config: Config = {
  clearMocks: true,
  preset: "ts-jest",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.ts", "!src/**/__utils__/*.ts", "!src/**/__fixtures__/*.ts"],
  coverageReporters: ["json-summary", "text", "lcov"],
  coverageDirectory: "./coverage",
  testPathIgnorePatterns: ["__utils__/", "dist/"],
  testTimeout: 30000,
  maxWorkers: "50%",
  verbose: true,
  silent: true
};

export default config;
