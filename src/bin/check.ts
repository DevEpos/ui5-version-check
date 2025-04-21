import { parseArgs, ParseArgsConfig } from "util";
import { UI5VersionCheck } from "../lib/ui5-version-check";
import path from "path";
import { glob } from "glob";

const helpText = `
SYNOPSIS

    ui5vc check <options>
    ui5vc c <options>

    Checks the validity of UI5 versions

OPTIONS

    -p | --basePath <path>

        Base path to start 

    -m | --manifestPaths <paths>

        Paths to manifest.json files

    --allowedDaysBeforeEocp

        Number of allowed days before the end of eocp quarter (e.g. Q1/2024).
        The default for this option is 30 days

    -f | --fix

        If provided outdated versions are automatically fixed

    --useLTS

        If provided, outdated versions are updated with the latest available
        LTS version.

    --eomAllowed

        If provided, versions that reached only the status "End of Maintenance"
        will produce warnings only and not result in an exit code <> 0.
`;

type CheckOptions = {
  basePath: string;
  manifestPaths: string[];
  allowedDaysBeforeEocp: number;
  fix: boolean;
  eomAllowed: boolean;
  useLTS: boolean;
};

const optionArgs: ParseArgsConfig["options"] = {
  basePath: {
    type: "string",
    short: "p"
  },
  manifestPaths: {
    type: "string",
    short: "m"
  },
  fix: {
    type: "boolean",
    short: "f"
  },
  eomAllowed: {
    type: "boolean"
  },
  useLTS: {
    type: "boolean"
  },
  allowedDaysBeforeEocp: {
    type: "string"
  }
};

function checkMandatory(opts: Partial<CheckOptions>) {
  if (!opts.basePath) throw new Error("Mandatory option 'basePath' not provided");
}

export default {
  help: () => console.log(helpText),
  exec: async () => {
    const optVals = parseArgs({ args: process.argv, options: optionArgs, allowPositionals: true })
      .values as Partial<CheckOptions>;
    checkMandatory(optVals);

    const checkOpts: CheckOptions = {
      basePath: path.resolve(optVals.basePath!),
      manifestPaths: optVals.manifestPaths ?? ["**"],
      fix: !!optVals.fix,
      eomAllowed: !!optVals.eomAllowed,
      useLTS: !!optVals.useLTS,
      allowedDaysBeforeEocp: parseInt(optVals.allowedDaysBeforeEocp as unknown as string) ?? 30
    };

    const resolvedManifestPaths = await glob(
      checkOpts.manifestPaths.map((p) => p + "/manifest.json"),
      { cwd: checkOpts.basePath }
    );

    const versionCheck = new UI5VersionCheck(
      checkOpts.basePath,
      resolvedManifestPaths,
      checkOpts.fix,
      checkOpts.useLTS,
      checkOpts.eomAllowed,
      checkOpts.allowedDaysBeforeEocp
    );
    versionCheck
      .run()
      .then(() => {
        console.log(versionCheck.summary);
        if (versionCheck.hasErrors) {
          console.log(`Invalid versions in manifest files detected!`);
          process.exit(1);
        }
      })
      .catch((e: Error) => {
        console.error(e);
        process.exit(1);
      });
  }
};
