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

/**
 * List of maintained UI5 versions including all valid patches
 */
export type UI5Versions = {
  /**
   * Map of UI5 versions where the key follows the pattern `1.120.*`
   */
  versions: Map<string, UI5Version>;
  /**
   * Map of UI5 version patches where the key follows the pattern `1.120.1`
   */
  patches: Map<string, UI5VersionPatch>;
};

/**
 * Fetches a list of valid/maintained SAPUI5 versions
 *
 * @returns collection of valid versions and patches
 *
 * @see https://ui5.sap.com/versionoverview.html
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

/**
 * Base class to represent a UI5 version
 */
export abstract class BaseVersionInfo {
  private static quarterToEocpInfo = new Map<string, EocpInfo>();
  private eocpYearQuarter: string;
  /** parsed semantic version representation */
  semver: semver.SemVer;

  constructor(semver: semver.SemVer, eocp: string) {
    this.semver = semver;
    this.eocpYearQuarter = eocp;
  }

  /**
   * Returns `true` if version has reached end of cloud provisioning
   */
  get eocp(): boolean {
    return !!this.checkEocp()?.eocp;
  }

  /**
   * Returns the actual date when end of cloud provisioning is reached
   */
  get eocpDate(): Date | undefined {
    return this.checkEocp()?.eocpDate;
  }

  /**
   * Returns `true` if the version reached the last year quarter before it is deprovisioned
   */
  get isInEocpQuarter(): boolean {
    return !!this.checkEocp()?.inEocpQuarter;
  }

  /**
   * Returns the remaining number of days before end of cloud provisioning.
   *
   * **NOTE**:<br>
   * If the eocp quarter has not been reached yet, the return value is `-1`.
   */
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

/**
 * UI5 version representation
 */
export class UI5Version extends BaseVersionInfo {
  /** Indicates if the version has long term support */
  lts: boolean;
  /** Indicates if the version has reached end of maintenance */
  eom: boolean;
  constructor(semver: semver.SemVer, eocp: string, lts: boolean, eom: boolean) {
    super(semver, eocp);
    this.lts = lts;
    this.eom = eom;
  }
}

/**
 * UI5 version patch representation
 */
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
