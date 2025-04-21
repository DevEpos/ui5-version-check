#!/usr/bin/env node

import help from "./help";
import check from "./check";
import versionCmd from "./version";

const commands: {
  short: string;
  long: string;
  help: () => void;
  exec?: () => void | Promise<void>;
  isHelp?: boolean;
}[] = [
  {
    short: "h",
    long: "help",
    help: help.help,
    isHelp: true
  },
  {
    short: "c",
    long: "check",
    help: check.help,
    exec: check.exec
  },
  {
    short: "v",
    long: "version",
    help: versionCmd.help,
    exec: versionCmd.exex
  }
];

function unknownCmd(cmd: string) {
  console.error(`Unknown command ${cmd}`);
  help.help();
}

function isHelp(cmd: string) {
  return getCommand(cmd)?.isHelp ?? false;
}

function getCommand(cmd: string) {
  return commands.find(({ short, long }) => cmd === short || cmd === long);
}

function cli() {
  if (process.argv.length <= 2) {
    console.error(`No valid command supplied`);
    help.help();
    return;
  }
  const cmdName = process.argv[2];
  if (isHelp(cmdName)) {
    if (process.argv.length === 4) {
      const helpForCmd = getCommand(process.argv[3]);
      if (!helpForCmd) {
        unknownCmd(process.argv[3]);
      } else {
        helpForCmd.help();
      }
    } else {
      help.help();
      return;
    }
  } else {
    const cmd = getCommand(cmdName);
    if (!cmd) {
      unknownCmd(cmdName);
    } else {
      try {
        cmd.exec?.();
      } catch (e) {
        console.error(`Error during executing command '${cmd.long}'`);
        console.error((e as Error).message);
        process.exit(1);
      }
    }
  }
}

cli();
