import * as semver from "semver";
import { isPromise } from "util/types";
import { BaseVersionInfo, fetchMaintainedVersions, isUI5VersionList, UI5Versions } from "./ui5-version-api";

export type ValidationMessage = {
  msg: string;
  type: "warn" | "error";
};

/**
 * Information about UI5 version
 */
export type UI5VersionInfo = {
  /** string reprentation of the version */
  strVer: string;
  /** Semantic version */
  semver: semver.SemVer;
  /** Indicates if the version allows patch updates (i.e. 1.71.*) */
  patchUpdates: boolean;
  /** Conversion of concrete version to patch update version */
  toPatchUpdateVers: () => string;
};

type VersionValidationOptions = {
  allowedDaysBeforeEocp: number;
  eomAllowed: boolean;
};

export class VersionValidator {
  private isValid = false;
  private messages: ValidationMessage[] = [];

  constructor(
    private version: UI5VersionInfo,
    private versionOverview: UI5Versions,
    private opts: VersionValidationOptions
  ) {}

  validate() {
    if (this.version.patchUpdates) {
      this.validatePatchUpdateVersion();
    } else {
      this.validateSpecificVersion();
    }
    return { valid: this.isValid, messages: this.messages };
  }

  private validateSpecificVersion() {
    const matchingVersion = this.versionOverview.versions.get(this.version.toPatchUpdateVers());
    if (!matchingVersion || matchingVersion.eocp) {
      this.addInvalidMsg();
      return;
    }
    if (!this.checkEom(matchingVersion.eom)) return;

    const matchingPatch = this.versionOverview.patches.get(this.version.strVer);
    if (!matchingPatch) {
      const patchSemver = this.version.semver;
      this.messages.push({
        msg: `Patch ${patchSemver.patch} of version ${patchSemver.major}.${patchSemver.minor} is not available`,
        type: "error"
      });
      return;
    }

    if (this.checkRemainingDays(matchingPatch)) {
      this.isValid = true;
    }
  }

  private validatePatchUpdateVersion() {
    const matchingVersion = this.versionOverview.versions.get(this.version.strVer);
    if (!matchingVersion || matchingVersion.eocp) {
      this.addInvalidMsg();
      return;
    }
    if (!this.checkEom(matchingVersion.eom)) return;

    if (this.checkRemainingDays(matchingVersion)) {
      this.isValid = true;
    }
  }

  private checkEom(eom: boolean) {
    if (!eom) return true;

    const msg = `Version reached end of maintenance!`;
    const type = this.opts.eomAllowed ? "warn" : "error";
    this.messages.push({ msg, type });
    return type !== "error";
  }

  private addInvalidMsg() {
    this.messages.push({
      msg: `Version ${this.version.strVer} is invalid or reached end of cloud provisioning!`,
      type: "error"
    });
  }

  private checkRemainingDays(version: BaseVersionInfo) {
    const { isInEocpQuarter, remainingDaysToEocp } = version;
    if (isInEocpQuarter && remainingDaysToEocp) {
      if (remainingDaysToEocp < this.opts.allowedDaysBeforeEocp) {
        this.messages.push({
          msg: `End of cloud provisioning for version imminent (${remainingDaysToEocp} days remaining)!`,
          type: "error"
        });
        return false;
      } else {
        this.messages.push({
          msg: `Version is near the end of cloud provisioning (${remainingDaysToEocp} days remaining)!`,
          type: "warn"
        });
        return true;
      }
    }
    return true;
  }
}

/**
 * Parses the given version string
 *
 * @param v version string (e.g. 1.71.1, 1.120.*)
 * @returns parsed version including a semver version
 */
export function parseVersion(v: string): UI5VersionInfo {
  const semVer = semver.coerce(v);

  return {
    strVer: v,
    semver: semVer,
    patchUpdates: /\d+\.\d+\.\*/.test(v),
    toPatchUpdateVers: () => `${semVer?.major}.${semVer?.minor}.*`
  };
}

type ValidationResult = { version: string } & ReturnType<VersionValidator["validate"]>;

/**
 * Verifies if the passed version is still a valid UI5 version
 *
 * @param v version string or array of version strings (e.g. 1.71.1, 1.120.*)
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns Promise with check resu
 */
export async function validateVersion(
  version: string | string[],
  opts?: Partial<VersionValidationOptions>
): Promise<ValidationResult[]>;

/**
 * Verifies if the passed version is still a valid UI5 version
 *
 * @param v version string or array of version strings (e.g. 1.71.1, 1.120.*)
 * @param ui5Versions list of valid UI5 versions and patches
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns Promise with check resu
 */
export function validateVersion(
  version: string | string[],
  ui5Versions: UI5Versions,
  opts?: Partial<VersionValidationOptions>
): ValidationResult[];

export function validateVersion(
  version: string | string[],
  ui5VersionsOrOpts?: UI5Versions | Partial<VersionValidationOptions>,
  opts?: Partial<VersionValidationOptions>
): Promise<ValidationResult[]> | ValidationResult[] {
  let versionOverview: UI5Versions | Promise<UI5Versions>;
  let validationOptions: VersionValidationOptions;

  if (isUI5VersionList(ui5VersionsOrOpts)) {
    versionOverview = ui5VersionsOrOpts;
    validationOptions = {
      allowedDaysBeforeEocp: opts?.allowedDaysBeforeEocp ?? 30,
      eomAllowed: opts?.eomAllowed ?? true
    };
  } else {
    versionOverview = fetchMaintainedVersions();
    validationOptions = {
      allowedDaysBeforeEocp: ui5VersionsOrOpts?.allowedDaysBeforeEocp ?? 30,
      eomAllowed: ui5VersionsOrOpts?.eomAllowed ?? true
    };
  }

  const versions = typeof version === "string" ? [version] : version;

  return isPromise(versionOverview)
    ? (versionOverview.then((fetchedVersions) =>
        versions.map((x) => ({
          version: x,
          ...new VersionValidator(parseVersion(x), fetchedVersions, validationOptions).validate()
        }))
      ) as Promise<ValidationResult[]>)
    : versions.map((x) => ({
        version: x,
        ...new VersionValidator(parseVersion(x), versionOverview, validationOptions).validate()
      }));
}
