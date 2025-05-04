import { BaseVersionInfo, latestVersion, UI5Version, UI5Versions } from "../../src/lib/ui5-version-api";
import { mockNodeFetch } from "../__fixtures__/fetch";

const { mock: fetchMock, mockFetchResponse } = mockNodeFetch();

describe("fetch latest UI5 Version", () => {
  jest.useFakeTimers();

  beforeEach(() => {
    fetchMock.mockClear();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BaseVersionInfo as any).quarterToEocpInfo.clear();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("should return the latest version from a provided UI5Versions object", () => {
    const mockVersions: UI5Versions = {
      versions: new Map([
        ["1.120.*", { eocp: false, eom: false, lts: false } as UI5Version],
        ["1.119.*", { eocp: false, eom: false, lts: true } as UI5Version]
      ]),
      patches: new Map()
    };

    const result = latestVersion(mockVersions);
    expect(result).toBe("1.120.*");
  });

  it("should return the latest LTS version from a provided UI5Versions object", () => {
    const mockVersions: UI5Versions = {
      versions: new Map([
        ["1.120.*", { eocp: false, eom: false, lts: false } as UI5Version],
        ["1.119.*", { eocp: false, eom: false, lts: true } as UI5Version]
      ]),
      patches: new Map()
    };

    const result = latestVersion(mockVersions, true);
    expect(result).toBe("1.119.*");
  });

  it("should fetch versions and return the latest version when no UI5Versions object is provided", async () => {
    jest.setSystemTime(new Date(2026));
    mockFetchResponse({
      versions: [
        {
          version: "1.134.*",
          support: "Maintenance",
          lts: false,
          eom: "",
          eocp: "Q4/2030"
        },
        {
          version: "1.133.*",
          support: "Maintenance",
          lts: true,
          eom: "Q4/2026",
          eocp: "Q4/2026"
        }
      ],
      patches: []
    });

    const result = await latestVersion();
    expect(result).toBe("1.134.*");
  });

  it("should fetch versions and return the latest LTS version when no UI5Versions object is provided", async () => {
    jest.setSystemTime(new Date(2025));
    mockFetchResponse({
      versions: [
        {
          version: "1.120.*",
          support: "Maintenance",
          lts: false,
          eom: "",
          eocp: "Q4/2030"
        },
        {
          version: "1.119.*",
          support: "Maintenance",
          lts: true,
          eom: "",
          eocp: "Q4/2026"
        }
      ],
      patches: []
    });

    const result = await latestVersion(true);
    expect(result).toBe("1.119.*");
  });

  it("should throw an error if no valid LTS version is found", () => {
    const mockVersions: UI5Versions = {
      versions: new Map([
        ["1.120.*", { eocp: false, eom: false, lts: false } as UI5Version],
        ["1.119.*", { eocp: false, eom: false, lts: false } as UI5Version]
      ]),
      patches: new Map()
    };

    expect(() => latestVersion(mockVersions, true)).toThrow("No valid LTS UI5 version found");
  });

  it("should throw an error if no valid version is found", async () => {
    jest.setSystemTime(new Date(2025));
    mockFetchResponse({
      versions: [
        {
          version: "1.120.*",
          support: "Out of Maintenance",
          lts: false,
          eocp: "Q4/2024"
        },
        {
          version: "1.119.*",
          support: "Out of Maintenance",
          lts: false,
          eocp: "Q4/2024"
        }
      ],
      patches: []
    });

    await expect(latestVersion()).rejects.toThrow("No valid UI5 version");
  });
});
