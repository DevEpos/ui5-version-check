import { ManifestCheckSummary, UI5AppManifest } from "./ui5-manifest";
import { UI5Versions, fetchMaintainedVersions, latestVersion } from "./ui5-version-api";
import { getLogger } from "./utils";
import { VersionValidator } from "./version-validation";

export type CheckSettings = {
  /** base path */
  basePath: string;
  /** relative paths of `manifest.json` files (starting from the `basePath`) */
  manifestPaths: string[];
  /** If `true` the invalid/outdated UI5 versions will be fixed */
  fixOutdated: boolean;
  /** If `true`, the latest LTS will be used as the new version */
  useLTS: boolean;
  /** If `true` version that have reached end of maintenance will not trigger an error */
  eomAllowed: boolean;
  /** Number of days that are allowed before the actual end of cloud provisioning */
  allowedDaysBeforeEocp: number;
};

/**
 * Allows the check and/or fixing of invalid UI5 versions.
 *
 * **NOTE:**<br>
 * Currently only a list of `manifest.json` files can checked
 */
export class UI5VersionCheck {
  private ui5Versions!: UI5Versions;
  private _updatedFiles: string[] = [];
  private errorCount = 0;
  private _summary: ManifestCheckSummary[] = [];
  private _newVersion: string | undefined;
  private opts: CheckSettings;
  private logger = getLogger();

  /**
   *
   * @param opts - Settings for Check
   */
  constructor(opts: Partial<CheckSettings> & Pick<CheckSettings, "basePath" | "manifestPaths">) {
    this.opts = {
      basePath: opts.basePath,
      manifestPaths: opts.manifestPaths,
      allowedDaysBeforeEocp: opts.allowedDaysBeforeEocp ?? 30,
      useLTS: opts.useLTS ?? true,
      eomAllowed: opts.eomAllowed ?? true,
      fixOutdated: opts.fixOutdated ?? false
    };
  }

  async run() {
    this.logger.group("Loading UI5 versions");
    this.ui5Versions = await fetchMaintainedVersions();
    this.logger.info(`Found ${this.ui5Versions.versions.size} versions and ${this.ui5Versions.patches.size} patches`);
    this.logger.groupEnd();

    this.logger.group("Checking UI5 versions in manifest.json files");
    this.opts.manifestPaths.forEach((mp) => {
      const manifest = new UI5AppManifest(this.opts.basePath, mp);
      this.checkManifest(manifest);
      this._summary.push(manifest.getCheckSummary());
    });
    this.logger.groupEnd();
  }

  get hasErrors() {
    return this.errorCount > 0;
  }

  get summary() {
    return this._summary;
  }

  get updatedFiles() {
    return this._updatedFiles;
  }

  private get newVersion() {
    if (this._newVersion) return this._newVersion;

    this._newVersion = latestVersion(this.ui5Versions, this.opts.useLTS);
    return this._newVersion;
  }

  private checkManifest(manifest: UI5AppManifest) {
    if (!manifest?.version) return;

    this.logger.info(`Checking version ${manifest.version.strVer} in manifest at ${manifest.relPath}`);

    const { valid, messages } = this.validateVersion(manifest);

    if (this.opts.fixOutdated) {
      if (!valid) {
        // fix the version in the manifest
        manifest.updateVersion(this.newVersion, this.opts.useLTS);
        this._updatedFiles.push(manifest.relPath);
      } else {
        manifest.setNoChangeStatus(messages);
      }
    } else {
      if (valid) {
        manifest.setNoChangeStatus(messages);
      } else {
        this.errorCount++;
        manifest.setErrorStatus(messages);
      }
    }
  }

  private validateVersion(manifest: UI5AppManifest) {
    if (!manifest.version) {
      /* istanbul ignore next */
      return { valid: false, messages: [] };
    } else {
      const validator = new VersionValidator(manifest.version, this.ui5Versions, this.opts);
      return validator.validate();
    }
  }
}
