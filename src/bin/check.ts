import { parseArgs, ParseArgsConfig } from "util";
import { UI5VersionCheck } from "../lib/ui5-version-check";
import path from "path";
import { glob } from "glob";
import { ManifestCheckSummary } from "../lib/ui5-manifest";

const helpText = `
SYNOPSIS

    ui5vc check <options>
    ui5vc c <options>

    Checks the validity of UI5 versions. Via the option '--fix' it also possible
    to correct invalid versions

OPTIONS

    -p | --basePath <path>

        Base path to start 

    -m | --manifestPaths <paths>

        Paths to manifest.json files. If ommitted every manifest.json file starting from the
        provided basePath will be checked

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

type CliCheckOptions = Omit<CheckOptions, "manifestPaths"> & { manifestPaths: string };

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

function checkMandatory(opts: Partial<CliCheckOptions>) {
  if (!opts.basePath) throw new Error("Mandatory option 'basePath' not provided");
}

function printSummary(checkSummary: ManifestCheckSummary[]) {
  if (!checkSummary?.length) {
    return;
  }

  console.log(
    `${checkSummary.filter((c) => c.status === "error").length} of ${checkSummary.length} manifest.json files contain version errors!\n`
  );
  const headers = ["Manifest Path", "Old Version", "New Version", "Status", "Status Message"];

  // Calculate column widths based on the longest value in each column
  const columnWidths = headers.map((header, index) => {
    const maxContentLength = checkSummary.reduce((max, row) => {
      const value = [row.relPath, row.oldVers, row.newVers, row.statusIcon, row.statusText][index];
      return Math.max(max, value.length);
    }, header.length);
    return maxContentLength;
  });
  // Print the header row
  console.log(`| ${headers.map((header, i) => header.padEnd(columnWidths[i])).join(" | ")} |`);

  // Print the separator row
  console.log(`| ${columnWidths.map((width) => "-".repeat(width)).join(" | ")} |`);

  // Print each row of the summary
  checkSummary.forEach((row) => {
    const values = [row.relPath, row.oldVers, row.newVers, row.statusIcon, row.statusText];
    console.log(
      `| ${values.map((value, i) => value.padEnd(i === 3 ? columnWidths[i] - 1 : columnWidths[i])).join(" | ")} |`
    );
  });
}

export default {
  help: () => console.log(helpText),
  exec: async () => {
    const optVals = parseArgs({ args: process.argv, options: optionArgs, allowPositionals: true })
      .values as Partial<CliCheckOptions>;

    checkMandatory(optVals);

    const allowedDaysBeforeEocp = parseInt(optVals.allowedDaysBeforeEocp as unknown as string);
    const checkOpts: CheckOptions = {
      basePath: path.resolve(optVals.basePath!),
      manifestPaths: optVals.manifestPaths?.split(",") ?? ["**"],
      fix: !!optVals.fix,
      eomAllowed: !!optVals.eomAllowed,
      useLTS: !!optVals.useLTS,
      allowedDaysBeforeEocp: isNaN(allowedDaysBeforeEocp) ? 30 : allowedDaysBeforeEocp
    };

    const resolvedManifestPaths = await glob(
      checkOpts.manifestPaths.map((p) => p + "/manifest.json"),
      { cwd: checkOpts.basePath }
    );

    if (!resolvedManifestPaths?.length) {
      console.log("No manifest.json files found!");
      return;
    }

    const versionCheck = new UI5VersionCheck({
      repoPath: checkOpts.basePath,
      manifestPaths: resolvedManifestPaths,
      fixOutdated: checkOpts.fix,
      useLTS: checkOpts.useLTS,
      eomAllowed: checkOpts.eomAllowed,
      allowedDaysBeforeEocp: checkOpts.allowedDaysBeforeEocp
    });

    await versionCheck.run();
    printSummary(versionCheck.summary);
    if (versionCheck.hasErrors) {
      process.exit(1);
    }
  }
};
