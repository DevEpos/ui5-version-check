import { mockNodeFetch } from "../__fixtures__/fetch";
import { UI5VersionCheck } from "../../src";
import fs from "fs";
import path from "path";

const { mock: fetchMock, mockFetchResponse } = mockNodeFetch();

const repoPath = path.join(__dirname, "..", "sample-project");
const manifestPaths = [
  "app/rating/webapp/manifest.json",
  "app/chatbot/webapp/manifest.json",
  "app/catalog/webapp/manifest.json",
  "app/admin/webapp/manifest.json",
  "app/apitester/webapp/manifest.json"
];

describe("ui5-version-check.ts", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    jest.useFakeTimers().setSystemTime(new Date("2025-03-15"));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it("Check UI5 versions successfully (eom: true; lts: false)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    const versionChecker = new UI5VersionCheck({ basePath: repoPath, manifestPaths, useLTS: false, eomAllowed: true });
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.summary.filter((i) => i.status === "ok")).toHaveLength(1);
    expect(versionChecker.summary.filter((i) => i.status === "warn")).toHaveLength(1);
    expect(versionChecker.summary.filter((i) => i.status === "error")).toHaveLength(3);
  });

  it("Check UI5 versions successfully (eom: false; lts: true)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    const versionChecker = new UI5VersionCheck({ basePath: repoPath, manifestPaths, eomAllowed: false, useLTS: true });
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.summary.filter((i) => i.status === "ok")).toHaveLength(1);
    expect(versionChecker.summary.filter((i) => i.status === "warn")).toHaveLength(0);
    expect(versionChecker.summary.filter((i) => i.status === "error")).toHaveLength(4);
  });

  it("Check UI5 versions successfully (eom: false; lts: false)", async () => {
    mockFetchResponse(mockedVersionsOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    const versionChecker = new UI5VersionCheck({ basePath: repoPath, manifestPaths, useLTS: false, eomAllowed: false });
    await expect(versionChecker.run()).resolves.toBeUndefined();
    expect(versionChecker.hasErrors).toBeTruthy();
    expect(versionChecker.summary.filter((i) => i.status === "ok")).toHaveLength(1);
    expect(versionChecker.summary.filter((i) => i.status === "warn")).toHaveLength(0);
    expect(versionChecker.summary.filter((i) => i.status === "error")).toHaveLength(4);
  });

  it("Updates UI5 versions successfully", async () => {
    mockFetchResponse(mockedVersionsOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    const versionCheck = new UI5VersionCheck({ basePath: repoPath, manifestPaths, fixOutdated: true, useLTS: false, eomAllowed: true });
    await expect(versionCheck.run()).resolves.toBeUndefined();
    expect(versionCheck.updatedFiles.length).toBeGreaterThan(0);
  });

  it("Update of UI5 versions not possible as no LTS version found", async () => {
    const clonedMockVersOverview = structuredClone(mockedVersionsOverview);
    clonedMockVersOverview.versions.forEach((v) => {
      if (v.lts) v.lts = false;
    });
    mockFetchResponse(clonedMockVersOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    await expect(new UI5VersionCheck({ basePath: repoPath, manifestPaths, fixOutdated: true }).run()).rejects.toThrow(
      new Error("No valid LTS UI5 version found")
    );
  });

  it("Update of UI5 versions not possible as no latest maintained version found", async () => {
    const clonedMockVersOverview = structuredClone(mockedVersionsOverview);
    clonedMockVersOverview.versions.forEach((v) => {
      if (v.lts) v.lts = false;
      v.eocp = "Q4/2024";
      v.eom = "Q4/2024";
      v.support = "Out of maintenance";
    });
    mockFetchResponse(clonedMockVersOverview);
    jest.spyOn(fs, "writeFileSync").mockImplementation();

    await expect(new UI5VersionCheck({ basePath: repoPath, manifestPaths, fixOutdated: true, useLTS: false, eomAllowed: true }).run()).rejects.toThrow(
      new Error("No valid UI5 version found")
    );
  });

  it("Tests version validation > breaks because manifest version is undefined", async () => {
    const versionChecker = new UI5VersionCheck({ basePath: repoPath, manifestPaths, useLTS: false, eomAllowed: false });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((versionChecker as any).validateVersion({})).toEqual({ valid: false, messages: [] });
  });
});

const mockedVersionsOverview = {
  versions: [
    {
      version: "1.134.*",
      support: "Maintenance",
      lts: false,
      eom: "",
      eocp: "Q1/2026"
    },
    {
      version: "1.133.*",
      support: "Maintenance",
      lts: false,
      eom: "Q3/2025",
      eocp: "Q3/2026"
    },
    {
      version: "1.132.*",
      support: "Out of maintenance",
      lts: false,
      eom: "",
      eocp: "Q2/2026"
    },
    {
      version: "1.129.*",
      support: "Out of maintenance",
      lts: false,
      eom: "Q1/2025",
      eocp: "Q1/2026"
    },
    {
      version: "1.120.*",
      support: "Maintenance",
      lts: true,
      eom: "Q1/2025",
      eocp: "Q1/2026"
    },
    {
      version: "1.114.*",
      support: "Out of maintenance",
      lts: false,
      eom: "Q4/2024",
      eocp: "Q1/2025"
    }
  ],
  patches: [
    {
      version: "1.134.0",
      eocp: "To Be Determined"
    },
    {
      version: "1.133.0",
      eocp: "To Be Determined"
    },
    {
      version: "1.132.1",
      eocp: "Q1/2026"
    },
    {
      version: "1.132.0",
      eocp: "Q1/2026"
    },
    {
      version: "1.129.1",
      eocp: "Q1/2026"
    },
    {
      version: "1.129.0",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.8",
      eocp: "To Be Determined"
    },
    {
      version: "1.130.7",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.6",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.5",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.4",
      eocp: "Q1/2026"
    },
    {
      version: "1.130.3",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.2",
      eocp: "Q4/2025"
    },
    {
      version: "1.130.1",
      eocp: "Q4/2025"
    },
    {
      version: "1.120.1",
      eocp: "Q2/2025"
    },
    {
      version: "1.114.4",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.3",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.2",
      eocp: "Q3/2024",
      removed: true
    },
    {
      version: "1.114.1",
      eocp: "Q3/2024",
      removed: true
    }
  ]
};
