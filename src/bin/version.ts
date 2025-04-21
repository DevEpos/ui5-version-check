import { readFileSync } from "node:fs";
import * as path from "node:path";

const helpText = `
SYNOPSIS

    ui5vc version 
    ui5vc v

    Prints version of the command line tool
`;

export default {
  help: () => console.log(helpText),
  exex: () => {
    let packageJson: string;
    try {
      packageJson = readFileSync(path.join(__dirname, "..", "package.json"), { encoding: "utf8" });
    } catch (_e) {
      packageJson = readFileSync(path.join(__dirname, "..", "..", "package.json"), { encoding: "utf8" });
    }

    console.log(`v${JSON.parse(packageJson).version}`);
  }
};
