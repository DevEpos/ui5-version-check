import { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/__utils__/*.ts"],
  testPathIgnorePatterns: ["__utils__/"],
  testTimeout: 30000,
  maxWorkers: "50%",
  collectCoverage: true,
  verbose: true,
  silent: true
};

export default config;
