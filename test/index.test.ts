import * as index from "../src/index";

describe("index.ts", () => {
  it("should export fetchMaintainedVersions", () => {
    expect(index.fetchMaintainedVersions).toBeDefined();
    expect(typeof index.fetchMaintainedVersions).toBe("function");
  });

  it("should export UI5VersionCheck", () => {
    expect(index.UI5VersionCheck).toBeDefined();
    expect(typeof index.UI5VersionCheck).toBe("function");
  });

  it("should export VersionValidator", () => {
    expect(index.VersionValidator).toBeDefined();
    expect(typeof index.VersionValidator).toBe("function");
  });

  it("should export validateVersion", () => {
    expect(index.validateVersion).toBeDefined();
    expect(typeof index.validateVersion).toBe("function");
  });

  it("should export parseVersion", () => {
    expect(index.parseVersion).toBeDefined();
    expect(typeof index.parseVersion).toBe("function");
  });

  it("should export latestVersion", () => {
    expect(index.latestVersion).toBeDefined();
    expect(typeof index.latestVersion).toBe("function");
  });

  it("should export getLogger", () => {
    expect(index.getLogger).toBeDefined();
    expect(typeof index.getLogger).toBe("function");
  });

  it("should export setLogger", () => {
    expect(index.setLogger).toBeDefined();
    expect(typeof index.setLogger).toBe("function");
  });
});
