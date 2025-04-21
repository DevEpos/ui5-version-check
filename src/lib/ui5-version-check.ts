import { ManifestCheckSummary, UI5AppManifest } from "./ui5-manifest";
import { UI5Version, UI5VersionPatch, fetchMaintainedVersions } from "./ui5-version-api";
import { VersionValidator } from "./version-validation";

export class UI5VersionCheck {
  private ui5Versions!: Map<string, UI5Version>;
  private ui5Patches!: Map<string, UI5VersionPatch>;
  private _updatedFiles: string[] = [];
  private errorCount = 0;
  private _summary: ManifestCheckSummary[] = [];
  private _newVersion: string | undefined;

  constructor(
    private repoPath: string,
    private manifestPaths: string[],
    private fixOutdated: boolean,
    private useLTS: boolean,
    private eomAllowed: boolean,
    private allowedDaysBeforeEocp: number
  ) {}

  async run() {
    const versions = await fetchMaintainedVersions();
    this.ui5Versions = versions.versions;
    this.ui5Patches = versions.patches;

    this.manifestPaths.forEach((mp) => {
      const manifest = new UI5AppManifest(this.repoPath, mp);
      this.checkManifest(manifest);
      this._summary.push(manifest.getSummary());
    });
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

    for (const [vId, v] of this.ui5Versions) {
      if (v.eocp || v.eom) continue;
      if (this.useLTS && !v.lts) continue;
      this._newVersion = vId;
      break;
    }

    if (!this._newVersion) {
      if (this.useLTS) {
        throw new Error(`No valid LTS UI5 version found to update`);
      } else {
        throw new Error(`No valid UI5 version found to update`);
      }
    }
    return this._newVersion;
  }

  private checkManifest(manifest: UI5AppManifest) {
    if (!manifest?.version) return;

    const { valid, messages } = this.validateVersion(manifest);

    if (this.fixOutdated) {
      if (!valid) {
        // fix the version in the manifest
        manifest.updateVersion(this.newVersion, this.useLTS);
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
      const validator = new VersionValidator(
        manifest.version,
        this.ui5Versions,
        this.ui5Patches,
        this.allowedDaysBeforeEocp,
        this.eomAllowed
      );
      return validator.validate();
    }
  }
}
