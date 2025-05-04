import { validateVersion } from "../../src/lib/version-validation";
import { fetchMaintainedVersions, UI5Version, UI5VersionPatch } from "../../src/lib/ui5-version-api";
import * as semver from "semver";

jest.mock("../../src/lib/ui5-version-api", () => ({
  ...jest.requireActual("../../src/lib/ui5-version-api"),
  fetchMaintainedVersions: jest.fn()
}));

describe("validateVersion", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should validate a single version successfully", async () => {
    (fetchMaintainedVersions as jest.Mock).mockResolvedValue({
      versions: new Map([["1.117.*", { eocp: false, eom: false }]]),
      patches: new Map([["1.117.1", { eocp: false, eom: false }]])
    });

    const result = await validateVersion("1.117.1", { allowedDaysBeforeEocp: 30, eomAllowed: true });

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: true,
        messages: []
      }
    ]);
  });

  it("should validate multiple versions and detect invalid ones", async () => {
    (fetchMaintainedVersions as jest.Mock).mockResolvedValue({
      versions: new Map([["1.117.*", { eocp: false, eom: false }]]),
      patches: new Map([["1.117.1", { eocp: false, eom: false }]])
    });

    const result = await validateVersion(["1.117.1", "1.118.*"], { allowedDaysBeforeEocp: 30, eomAllowed: false });

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: true,
        messages: []
      },
      {
        version: "1.118.*",
        valid: false,
        messages: [
          {
            msg: "Version 1.118.* is invalid or reached end of cloud provisioning!",
            type: "error"
          }
        ]
      }
    ]);
  });

  it("should handle versions that have reached EOM when EOM is allowed", async () => {
    (fetchMaintainedVersions as jest.Mock).mockResolvedValue({
      versions: new Map([["1.117.*", { eocp: false, eom: true }]]),
      patches: new Map([["1.117.1", { eocp: false, eom: true }]])
    });

    const result = await validateVersion("1.117.1", { allowedDaysBeforeEocp: 30, eomAllowed: true });

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: true,
        messages: [
          {
            msg: "Version reached end of maintenance!",
            type: "warn"
          }
        ]
      }
    ]);
  });

  it("should handle versions that have reached EOM when EOM is not allowed", async () => {
    (fetchMaintainedVersions as jest.Mock).mockResolvedValue({
      versions: new Map([["1.117.*", { eocp: false, eom: true }]]),
      patches: new Map([["1.117.1", { eocp: false, eom: true }]])
    });

    const result = await validateVersion("1.117.1", { allowedDaysBeforeEocp: 30, eomAllowed: false });

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: false,
        messages: [
          {
            msg: "Version reached end of maintenance!",
            type: "error"
          }
        ]
      }
    ]);
  });

  it("should handle versions that have reached EOM when EOM is not allowed (non promise function)", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const result = validateVersion(
      "1.117.1",
      {
        versions: new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, true)]]),
        patches: new Map([["1.117.1", new UI5VersionPatch(semver.coerce("1.117.1")!, "Q1/2026")]])
      },
      { allowedDaysBeforeEocp: 30, eomAllowed: false }
    );

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: false,
        messages: [
          {
            msg: "Version reached end of maintenance!",
            type: "error"
          }
        ]
      }
    ]);
  });

  it("should use default options during validation (non promise variant)", () => {
    const vutStr = "1.117.*";
    const vutSemver = semver.coerce(vutStr);
    const result = validateVersion("1.117.1", {
      versions: new Map([["1.117.*", new UI5Version(vutSemver!, "Q1/2026", true, true)]]),
      patches: new Map([["1.117.1", new UI5VersionPatch(semver.coerce("1.117.1")!, "Q1/2026")]])
    });

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: true,
        messages: [
          {
            msg: "Version reached end of maintenance!",
            type: "warn"
          }
        ]
      }
    ]);
  });

  it("should use default options during validation (promise variant)", async () => {
    (fetchMaintainedVersions as jest.Mock).mockResolvedValue({
      versions: new Map([["1.117.*", { eocp: false, eom: true }]]),
      patches: new Map([["1.117.1", { eocp: false, eom: true }]])
    });
    const result = await validateVersion("1.117.1");

    expect(result).toEqual([
      {
        version: "1.117.1",
        valid: true,
        messages: [
          {
            msg: "Version reached end of maintenance!",
            type: "warn"
          }
        ]
      }
    ]);
  });
});
