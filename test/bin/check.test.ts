import check from "../../src/bin/check";
import { glob } from "glob";
import { UI5VersionCheck } from "../../src/lib/ui5-version-check";

// Mock dependencies
jest.mock("glob", () => ({
  glob: jest.fn()
}));
jest.mock("../../src/lib/ui5-version-check", () => ({
  UI5VersionCheck: jest.fn().mockImplementation(() => ({
    run: jest.fn().mockResolvedValue(undefined), // Ensure run() returns a resolved Promise
    summary: [],
    hasErrors: false
  }))
}));

const mockExit = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
const mockLog = jest.spyOn(console, "log").mockImplementation(() => {});

describe("cli command check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should display help text when help() is called", () => {
    check.help();
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("SYNOPSIS"));
  });

  it("should throw an error if mandatory 'basePath' is not provided", async () => {
    process.argv = ["node", "cli.js", "check"];
    await expect(check.exec()).rejects.toThrow("Mandatory option 'basePath' not provided");
  });

  it("should resolve manifest paths and execute version check", async () => {
    process.argv = ["node", "cli.js", "check", "-p", "/test/path", "--allowedDaysBeforeEocp", "50"];
    (glob as unknown as jest.Mock).mockResolvedValue(["/test/path/manifest.json"]);
    (UI5VersionCheck as jest.Mock).mockImplementation(() => ({
      run: jest.fn().mockResolvedValue(undefined),
      summary: [
        {
          newVers: "-",
          oldVers: "1.55.*",
          relPath: "./manifest.json",
          status: "error",
          statusIcon: "❌",
          statusText: "error"
        }
      ],
      hasErrors: false
    }));

    await check.exec();

    expect(glob).toHaveBeenCalledWith(["**/manifest.json"], { cwd: "/test/path" });
    expect(UI5VersionCheck).toHaveBeenCalledWith({
      basePath: "/test/path",
      manifestPaths: ["/test/path/manifest.json"],
      fixOutdated: false,
      useLTS: false,
      eomAllowed: false,
      allowedDaysBeforeEocp: 50
    });
    expect(mockLog).toHaveBeenCalled(); // For summary output
  });

  it("should use the default value for allowedDaysBeforeEocp if a non-numeric value is provided", async () => {
    process.argv = ["node", "cli.js", "check", "-p", "/test/path", "--allowedDaysBeforeEocp", "invalid"];
    (glob as unknown as jest.Mock).mockResolvedValue(["/test/path/manifest.json"]);

    (UI5VersionCheck as jest.Mock).mockImplementation(() => ({
      run: jest.fn().mockResolvedValue(undefined),
      summary: [],
      hasErrors: false
    }));

    await check.exec();

    expect(glob).toHaveBeenCalledWith(["**/manifest.json"], { cwd: "/test/path" });
    expect(UI5VersionCheck).toHaveBeenCalledWith({
      basePath: "/test/path",
      manifestPaths: ["/test/path/manifest.json"],
      fixOutdated: false,
      useLTS: false,
      eomAllowed: false,
      allowedDaysBeforeEocp: 30 // Default value should be used
    });
  });

  it("should exit with code 1 if version check has errors", async () => {
    process.argv = ["node", "cli.js", "check", "-p", "/test/path"];
    (glob as unknown as jest.Mock).mockResolvedValue(["/test/path/manifest.json"]);
    (UI5VersionCheck as jest.Mock).mockImplementation(() => ({
      run: jest.fn().mockResolvedValue(undefined),
      summary: [],
      hasErrors: true
    }));

    await check.exec();

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should handle errors during execution and exit with code 1", async () => {
    const error = new Error("Test error");
    process.argv = ["node", "cli.js", "check", "-p", "/test/path"];
    (glob as unknown as jest.Mock).mockRejectedValue(error);

    await expect(check.exec()).rejects.toThrow(error);
  });

  it("should skip check if no manifest.json paths could be determined", async () => {
    process.argv = ["node", "cli.js", "check", "-p", "/test/path"];
    (glob as unknown as jest.Mock).mockResolvedValue([]); // Simulate no manifest.json files found

    await check.exec();

    expect(glob).toHaveBeenCalledWith(["**/manifest.json"], { cwd: "/test/path" });
    expect(mockLog).toHaveBeenCalledWith("No manifest.json files found!");
    expect(UI5VersionCheck).not.toHaveBeenCalled(); // Ensure version check is not executed
  });
});
