import * as semver from "semver";
import { isPromise } from "util/types";
import { BaseVersionInfo, fetchMaintainedVersions, isUI5VersionList, UI5Versions } from "./ui5-version-api";

/**
 * Validation message that occurs during version validation
 */
export type ValidationMessage = {
  /** Message */
  msg: string;
  /** Message type */
  type: "warn" | "error";
};

/**
 * Validation result for a UI5 version
 */
export type ValidationResult = {
  /** Version that has been validated */
  version: string;
  /** Indicates if the version if valid or not */
  valid: boolean;
  /** List of validation message */
  messages: ValidationMessage[];
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

/**
 * Configurable options for version validation
 */
export type VersionValidationOptions = {
  /** Number of allowed days before eocp is considered an error (default: 30) */
  allowedDaysBeforeEocp: number;
  /** Indicates whether or not out of maintenance versions are considered invalid */
  eomAllowed: boolean;
};

/**
 * Allows validation for a given UI5 version
 */
export class VersionValidator {
  private isValid = false;
  private messages: ValidationMessage[] = [];

  /**
   * Creates new instance of a VersionValidator
   * @param version contains information for a UI5 version
   * @param versionOverview list of UI5 versions and patches
   * @param opts options to configure the version validation
   */
  constructor(
    private version: UI5VersionInfo,
    private versionOverview: UI5Versions,
    private opts: VersionValidationOptions
  ) {}

  /**
   * Validates the UI5 version passed in the constructor
   *
   * @returns validation result
   */
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

/**
 * Verifies if the passed version is still a valid UI5 version
 *
 * @param version version string (e.g. 1.71.1, 1.120.*)
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns Promise with check result
 */
export function validateVersion(version: string, opts?: Partial<VersionValidationOptions>): Promise<ValidationResult>;

/**
 * Verifies if the passed versions are still valid UI5 versions
 *
 * @param version array of version strings (e.g. 1.71.1, 1.120.*)
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns Promise with check results
 */
export function validateVersion(
  version: string[],
  opts?: Partial<VersionValidationOptions>
): Promise<ValidationResult[]>;

/**
 * Verifies if the passed version is still a valid UI5 version
 *
 * @param version version string (e.g. 1.71.1, 1.120.*)
 * @param ui5Versions list of valid UI5 versions and patches
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns check result
 */
export function validateVersion(
  version: string,
  ui5Versions: UI5Versions,
  opts?: Partial<VersionValidationOptions>
): ValidationResult;

/**
 * Verifies if the passed versions are still valid UI5 versions
 *
 * @param version array of version strings (e.g. 1.71.1, 1.120.*)
 * @param ui5Versions list of valid UI5 versions and patches
 * @param opts validation options
 * @param opts.allowedDaysBeforeEocp number of days that are allowed before the actual eocp date
 * @param opts.eomAllowed indicates whether out of maintenance versions are allowed or not
 * @returns check results
 */
export function validateVersion(
  version: string[],
  ui5Versions: UI5Versions,
  opts?: Partial<VersionValidationOptions>
): ValidationResult[];

export function validateVersion(
  version: string | string[],
  ui5VersionsOrOpts?: UI5Versions | Partial<VersionValidationOptions>,
  opts?: Partial<VersionValidationOptions>
): Promise<ValidationResult | ValidationResult[]> | (ValidationResult | ValidationResult[]) {
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

  const validate = (ui5Versions: UI5Versions) => {
    const validationResults = versions.map((x) => ({
      version: x,
      ...new VersionValidator(parseVersion(x), ui5Versions, validationOptions).validate()
    }));
    return typeof version === "string" ? validationResults[0] : validationResults;
  };

  return isPromise(versionOverview)
    ? versionOverview.then((fetchedVersions) => validate(fetchedVersions))
    : validate(versionOverview);
}
