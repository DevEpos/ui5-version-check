import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { parseVersion, UI5VersionInfo, ValidationMessage } from "./version-validation";

/**
 * Summary of `manifest.json` file check
 */
export type ManifestCheckSummary = {
  /** Relative path to manifest */
  relPath: string;
  /** the detected version in the manifest */
  oldVers: string;
  /** the updated version or `-` */
  newVers: string;
  /** check status */
  status: "error" | "warn" | "ok";
  /** check status icon */
  statusIcon: "✅" | "⚠️" | "❌";
  /** contains status message, collected during check */
  statusText: string;
};

/**
 * Describes UI5 manifest, to be used to check
 * and/or update the used version.
 *
 * Considered versions are:
 *
 * - `sap.platform.cf/ui5VersionNumber`
 */
export class UI5AppManifest {
  /** Relative path to manifest */
  relPath: string;
  /** Full file path to manifest */
  fullPath: string;
  /** manifest content in string form */
  content: string;
  /** parsed version info of manifest */
  version: UI5VersionInfo | undefined;
  /** the new version of the manifest*/
  newVersion = "-";
  /** current version status */
  versionStatus: "ok" | "warn" | "error" = "ok";
  /** current version status text */
  versionStatusText = "-";

  /**
   * Creates new UI5 app manifest
   * @param basePath base path
   * @param relPath relative path to manifest from the given base path
   */
  constructor(basePath: string, relPath: string) {
    this.relPath = relPath;
    this.fullPath = path.join(basePath, this.relPath);
    this.content = readFileSync(this.fullPath, { encoding: "utf8" });
    this.version = this.determineVersion();
  }

  private determineVersion(): UI5VersionInfo | undefined {
    const manifestJson = JSON.parse(this.content) as { "sap.platform.cf": { ui5VersionNumber?: string } };
    const currentVersionStr = manifestJson["sap.platform.cf"]?.ui5VersionNumber?.replace(/[xX]/, "*");
    if (!currentVersionStr) {
      this.versionStatusText = `No section 'sap.platform.cf/ui5VersionNumber' found. Skipping check`;
      return;
    }

    return parseVersion(currentVersionStr);
  }

  /**
   * Updates the UI5 version in the manifest
   * @param version new version to be used
   * @param isLTS indicates if the passed version is an LTS version
   */
  updateVersion(version: string, isLTS: boolean) {
    const manifestContent = this.content.replace(
      /("sap\.platform\.cf"\s*:\s*\{\s*"ui5VersionNumber"\s*:\s*")(.*)(")/,
      `$1${version}$3`
    );
    writeFileSync(this.fullPath, manifestContent, { encoding: "utf8" });
    this.newVersion = version;
    /* istanbul ignore next */
    this.versionStatusText = `Version has been updated to latest${isLTS ? " LTS " : " "}version`;
    this.versionStatus = "ok";
  }

  /**
   * Sets status to indicate no version changes are required
   * @param messages array of possible validation messages
   */
  setNoChangeStatus(messages: ValidationMessage[]) {
    if (messages.length) {
      this.versionStatus = "warn";
      this.versionStatusText = messages.map((m) => m.msg).join("<br/>");
    } else {
      this.versionStatus = "ok";
      this.versionStatusText = `No change required`;
    }
  }

  /**
   * Sets status to error to indicate an invalid version
   * @param messages array of validation messages
   */
  setErrorStatus(messages: ValidationMessage[]) {
    this.versionStatus = "error";
    this.versionStatusText = messages.map((m) => m.msg).join("<br/>");
  }

  /**
   * Returns check summary of this manifest's used version(s)
   */
  getCheckSummary(): ManifestCheckSummary {
    return {
      relPath: this.relPath,
      oldVers: this.version?.strVer ?? "-",
      newVers: this.newVersion,
      status: this.versionStatus,
      statusIcon: this.versionStatus === "ok" ? "✅" : this.versionStatus === "warn" ? "⚠️" : "❌",
      statusText: this.versionStatusText
    };
  }
}
