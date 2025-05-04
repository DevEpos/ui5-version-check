import help from "../../src/bin/help";
import check from "../../src/bin/check";
import versionCmd from "../../src/bin/version";
import { cli } from "../../src/bin/cli";

// Mock the imported modules
jest.mock("../../src/bin/help", () => ({
  exec: jest.fn()
}));
jest.mock("../../src/bin/check", () => ({
  help: jest.fn(),
  exec: jest.fn()
}));
jest.mock("../../src/bin/version", () => ({
  help: jest.fn(),
  exec: jest.fn()
}));

// Mock process.exit and console methods
const mockExit = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
const mockError = jest.spyOn(console, "error").mockImplementation(() => {});

describe("cli", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset process.argv to its default state
    process.argv = ["node", "cli.js"];
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear the specific module from the cache
    delete require.cache[require.resolve("../../src/bin/cli")];
  });

  it("should display help when no command is provided", () => {
    process.argv = ["node", "cli.js"];
    cli();
    expect(mockError).toHaveBeenCalledWith("No valid command supplied");
    expect(help.exec).toHaveBeenCalled();
  });

  it("should display help for the 'help' command", () => {
    process.argv = ["node", "cli.js", "help"];
    cli();
    expect(help.exec).toHaveBeenCalled();
  });

  it("should display help for a specific command", () => {
    process.argv = ["node", "cli.js", "help", "check"];
    cli();
    expect(check.help).toHaveBeenCalled();
  });

  it("should display an error for an unknown command", () => {
    process.argv = ["node", "cli.js", "unknown"];
    cli();
    expect(mockError).toHaveBeenCalledWith("Unknown command unknown");
    expect(help.exec).toHaveBeenCalled();
  });

  it("should display an error for calling help on unknown command", () => {
    process.argv = ["node", "cli.js", "h", "unknown"];
    cli();
    expect(mockError).toHaveBeenCalledWith("Unknown command unknown");
    expect(help.exec).toHaveBeenCalled();
  });

  it("should execute the 'check' command", () => {
    process.argv = ["node", "cli.js", "check"];
    cli();
    expect(check.exec).toHaveBeenCalled();
  });

  it("should execute the 'version' command", () => {
    process.argv = ["node", "cli.js", "version"];
    cli();
    expect(versionCmd.exec).toHaveBeenCalled();
  });

  it("should handle errors during command execution", () => {
    const error = new Error("Test error");
    (check.exec as jest.Mock).mockImplementation(() => {
      throw error;
    });
    process.argv = ["node", "cli.js", "check"];
    cli();
    expect(mockError).toHaveBeenCalledWith("Error during executing command 'check'");
    expect(mockError).toHaveBeenCalledWith(error.message);
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
