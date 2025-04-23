import { UI5AppManifest } from "../../src/lib/ui5-manifest";
import * as semver from "semver";
import fs from "fs";

describe("ui5-manifest.ts", () => {
  const oldEnv = process.env;

  beforeEach(() => {});

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    process.env = { ...oldEnv };
  });

  it("Determines version in manifest with required section", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.120.*"
        }
      })
    );
    const manifest = new UI5AppManifest("/repopath", "test/manifest.json");
    expect(manifest.version?.semver).toEqual(semver.coerce("1.120.*"));
    expect(manifest.version?.patchUpdates).toBeTruthy();
    expect(manifest.version?.toPatchUpdateVers()).toEqual("1.120.*");

    expect(manifest.getCheckSummary()).toEqual({
      relPath: manifest.relPath,
      oldVers: "1.120.*",
      newVers: "-",
      status: "ok",
      statusIcon: "✅",
      statusText: "-"
    });
  });

  it("Test different values of version status", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({}));
    const manifest = new UI5AppManifest("/repopath", "test/manifest.json");

    manifest.setNoChangeStatus([]);
    expect(manifest.versionStatus).toBe("ok");
    expect(manifest.versionStatusText).toBe("No change required");
    expect(manifest.getCheckSummary()).toEqual({
      relPath: manifest.relPath,
      oldVers: "-",
      newVers: "-",
      status: "ok",
      statusIcon: "✅",
      statusText: "No change required"
    });

    manifest.setNoChangeStatus([
      { msg: "Eom", type: "warn" },
      { msg: "Unsafe", type: "warn" }
    ]);
    expect(manifest.versionStatus).toBe("warn");
    expect(manifest.versionStatusText).toBe("Eom<br/>Unsafe");
    expect(manifest.getCheckSummary()).toEqual({
      relPath: manifest.relPath,
      oldVers: "-",
      newVers: "-",
      status: "warn",
      statusIcon: "⚠️",
      statusText: "Eom<br/>Unsafe"
    });

    manifest.setErrorStatus([{ msg: "Eocp reached", type: "error" }]);
    expect(manifest.versionStatus).toBe("error");
    expect(manifest.versionStatusText).toBe("Eocp reached");
    expect(manifest.getCheckSummary()).toEqual({
      relPath: manifest.relPath,
      oldVers: "-",
      newVers: "-",
      status: "error",
      statusIcon: "❌",
      statusText: "Eocp reached"
    });
  });

  it("updateVersion()", () => {
    const writeFsMock = jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.117.*"
        }
      })
    );
    const manifest = new UI5AppManifest("/repopath", "test/manifest.json");
    expect(manifest.newVersion).toBe("-");
    manifest.updateVersion("1.134.1", true);
    expect(manifest.newVersion).toBe("1.134.1");
    expect(writeFsMock).toHaveBeenCalledWith(
      "/repopath/test/manifest.json",
      JSON.stringify({
        "sap.platform.cf": {
          ui5VersionNumber: "1.134.1"
        }
      }),
      { encoding: "utf8" }
    );
    expect(manifest.versionStatusText).toBe("Version has been updated to latest LTS version");
  });

  it("Manifest does not contain section for sap.platform.cf", () => {
    jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({}));
    const manifest = new UI5AppManifest("/repopath", "test/manifest.json");
    expect(manifest.version).toBeUndefined();
  });
});
