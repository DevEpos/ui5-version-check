import * as semver from "semver";
import { isPromise } from "util/types";

const VERSION_OVERVIEW_URL = "https://ui5.sap.com/versionoverview.json";

type ExternalUI5VersionInfo = {
  /** Version (e.g. 1.132.*) */
  version: string;
  support: "Out of maintenance" | "Maintenance";
  lts: boolean;
  eom: string;
  eocp: string;
};

type ExternalUI5VersionPatch = {
  version: string;
  eocp: string;
  removed?: boolean;
  hidden?: boolean;
};

type EocpInfo = {
  eocp: boolean;
  inEocpQuarter: boolean;
  remainingDaysToEocp?: number;
  eocpDate: Date;
};

export type UI5Versions = {
  versions: Map<string, UI5Version>;
  patches: Map<string, UI5VersionPatch>;
};

/**
 * @returns array of valid UI5 versions to be used in SAP BTP
 */
export async function fetchMaintainedVersions(): Promise<UI5Versions> {
  const res = await fetch(VERSION_OVERVIEW_URL);
  const ui5Versions = (await res.json()) as { versions: ExternalUI5VersionInfo[]; patches: ExternalUI5VersionPatch[] };

  const patchMap = new Map<string, UI5VersionPatch>();

  ui5Versions.patches
    .filter((p) => !p.removed && !p.hidden)
    .forEach((p) => {
      patchMap.set(p.version, new UI5VersionPatch(semver.coerce(p.version as string)!, p.eocp));
    });

  if (!ui5Versions.versions?.length) throw new Error(`No UI5 versions found in response`);

  const versionMap = new Map<string, UI5Version>();
  ui5Versions.versions.forEach((v) => {
    versionMap.set(v.version, new UI5Version(semver.coerce(v.version)!, v.eocp, v.lts, v.support !== "Maintenance"));
  });

  return { versions: versionMap, patches: patchMap };
}

export abstract class BaseVersionInfo {
  private static quarterToEocpInfo = new Map<string, EocpInfo>();
  private eocpYearQuarter: string;
  semver: semver.SemVer;

  constructor(semver: semver.SemVer, eocp: string) {
    this.semver = semver;
    this.eocpYearQuarter = eocp;
  }

  get eocp(): boolean {
    return !!this.checkEocp()?.eocp;
  }

  get eocpDate(): Date | undefined {
    return this.checkEocp()?.eocpDate;
  }

  get isInEocpQuarter(): boolean {
    return !!this.checkEocp()?.inEocpQuarter;
  }

  get remainingDaysToEocp(): number | undefined {
    return this.checkEocp()?.remainingDaysToEocp;
  }

  private checkEocp() {
    let eocpInfo = BaseVersionInfo.quarterToEocpInfo.get(this.eocpYearQuarter);
    if (eocpInfo !== undefined) return eocpInfo;

    const matchRes = this.eocpYearQuarter.match(/Q([1-4])\/(\d+)/);
    if (!matchRes?.length) return undefined;

    const quarter = parseInt(matchRes[1]);
    const month = quarter === 1 ? 0 : quarter === 2 ? 3 : quarter === 3 ? 6 : 9;
    const year = parseInt(matchRes[2]);

    const dateForYearQuarterStart = new Date(Date.UTC(year, month, 1));
    const dateForYearQuarterEnd = new Date(Date.UTC(year, month + 3, 0));
    const now = new Date();

    eocpInfo = {
      eocp: now > dateForYearQuarterEnd,
      eocpDate: dateForYearQuarterEnd, // NOTE: there is actually a 1 week buffer until removal
      inEocpQuarter: dateForYearQuarterStart < now && dateForYearQuarterEnd > now,
      remainingDaysToEocp:
        dateForYearQuarterStart > now || now > dateForYearQuarterEnd
          ? -1
          : Math.floor(Math.abs(dateForYearQuarterEnd.valueOf() - now.valueOf()) / (1000 * 60 * 60 * 24))
    };

    BaseVersionInfo.quarterToEocpInfo.set(this.eocpYearQuarter, eocpInfo);
    return eocpInfo;
  }
}

export class UI5Version extends BaseVersionInfo {
  lts: boolean;
  eom: boolean;
  constructor(semver: semver.SemVer, eocp: string, lts: boolean, eom: boolean) {
    super(semver, eocp);
    this.lts = lts;
    this.eom = eom;
  }
}

export class UI5VersionPatch extends BaseVersionInfo {}

export const isUI5VersionList = (obj: unknown): obj is UI5Versions =>
  typeof obj === "object" && obj && "versions" in obj && "patches" in obj;

/**
 * Fetches valid UI5 versions and returns the latest one
 * @param lts if `true` only LTS versions are considered
 */
export async function latestVersion(lts?: boolean): Promise<string>;

/**
 * Returns the latest version from the given list of UI5 versions
 * @param versions list UI5 versions
 * @param lts if `true` only LTS versions are considered
 */
export function latestVersion(versions: UI5Versions, lts?: boolean): string;
export function latestVersion(versionsOrLts?: boolean | UI5Versions, lts?: boolean): Promise<string> | string {
  let versionOverview: UI5Versions | Promise<UI5Versions>;
  let ltsOpt: boolean | undefined;

  if (isUI5VersionList(versionsOrLts)) {
    versionOverview = versionsOrLts;
    ltsOpt = !!lts;
  } else {
    versionOverview = fetchMaintainedVersions();
    ltsOpt = !!versionsOrLts;
  }

  const findVersion = (versionList: UI5Versions): string | undefined => {
    for (const [vId, v] of versionList.versions) {
      if (v.eocp || v.eom) continue;
      if (ltsOpt && !v.lts) continue;
      return vId;
    }
    if (ltsOpt) {
      throw new Error(`No valid LTS UI5 version found`);
    } else {
      throw new Error(`No valid UI5 version found`);
    }
  };

  if (isPromise(versionOverview)) {
    return versionOverview.then(findVersion);
  } else {
    return findVersion(versionOverview);
  }
}
