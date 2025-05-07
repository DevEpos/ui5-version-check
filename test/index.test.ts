import { SemVer } from "semver";
import * as index from "../src/index";

describe("index.ts", () => {
  it("should export a list of types", () => {
    <index.ValidationResult>{ version: "", valid: false, messages: [] };
    <index.VersionValidationOptions>{};
    <index.ManifestCheckSummary>{ newVers: "", oldVers: "", relPath: "", status: "warn", statusIcon: "⚠️" };
    <index.CheckSettings>{ allowedDaysBeforeEocp: 0, basePath: "", eomAllowed: false, fixOutdated: false, manifestPaths: [], useLTS: false };
    <index.Logger>{ error: () => {}, group: () => {}, groupEnd: () => {}, info: () => {}, notice: () => {}, warn: () => {} };
    <index.UI5VersionInfo>{ patchUpdates: true, semver: {} as SemVer, strVer: "", toPatchUpdateVers: () => "" };
    <index.UI5Versions>{ patches: new Map(), versions: new Map() };
    <index.ValidationMessage>{ msg: "", type: "error" };
    expect(true).toBe(true);
  });
  it("should export expected list", () => {
    const expectedExport = [
      "BaseVersionInfo",
      "UI5Version",
      "UI5VersionCheck",
      "UI5VersionPatch",
      "VersionValidator",
      "fetchMaintainedVersions",
      "getLogger",
      "latestVersion",
      "parseVersion",
      "setLogger",
      "validateVersion"
    ];

    expectedExport.forEach((exp) => {
      expect(index[exp]).toBeDefined();
      expect(typeof index[exp]).toBe("function");
    });
  });
});
