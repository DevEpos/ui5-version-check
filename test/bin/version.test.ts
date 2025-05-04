import { readFileSync } from "node:fs";
import * as path from "node:path";
import version from "../../src/bin/version";

jest.mock("node:fs", () => ({
  readFileSync: jest.fn()
}));

const mockLog = jest.spyOn(console, "log").mockImplementation(() => {});

describe("cli command version", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should print the help text", () => {
    version.help();
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("SYNOPSIS"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("ui5vc version"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("ui5vc v"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("Prints version of the command line tool"));
  });

  it("should print the version from the package.json file", () => {
    const mockPackageJson = JSON.stringify({ version: "1.2.3" });
    (readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join(__dirname, "..", "..", "src", "package.json")) {
        return mockPackageJson;
      }
      throw new Error("File not found");
    });

    version.exec();

    expect(readFileSync).toHaveBeenCalledWith(path.join(__dirname, "..", "..", "src", "package.json"), { encoding: "utf8" });
    expect(mockLog).toHaveBeenCalledWith("v1.2.3");
  });

  it("should fallback to the parent directorys package.json if the first one is not found", async () => {
    const mockPackageJson = JSON.stringify({ version: "2.3.4" });
    (readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join(__dirname, "..", "..", "src", "package.json")) {
        throw new Error("File not found");
      }
      if (filePath === path.join(__dirname, "..", "..", "package.json")) {
        return mockPackageJson;
      }
      throw new Error("File not found");
    });

    version.exec();

    expect(readFileSync).toHaveBeenCalledWith(path.join(__dirname, "..", "..", "src", "package.json"), { encoding: "utf8" });
    expect(readFileSync).toHaveBeenCalledWith(path.join(__dirname, "..", "..", "package.json"), { encoding: "utf8" });
    expect(mockLog).toHaveBeenCalledWith("v2.3.4");
  });
});
