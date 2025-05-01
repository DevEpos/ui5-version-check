# UI5 Version Check

[![npm version](https://badge.fury.io/js/ui5-version-check.svg)](https://badge.fury.io/js/ui5-version-check)
![Status](https://img.shields.io/badge/Status-beta-orange)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

> ⚠️ CLI and API are are not final yet and still subject to change ⚠️

Provides CLI and tools to check for invalid/outdated UI5 versions in a given project.

Currently the following files can be checked:

- `manifest.json`: Manifest descriptor of OpenUI5/SAPUI5 applications

## CLI

Currently available CLI commands

```
USAGE

    ui5vc <command> [<args>]

COMMANDS

    c | check    checks UI5 versions
    h | help     prints cli help or help for commands
    v | version  prints version information

Learn more about each command using:
ui5vc help <command>
ui5vc h <command>
```

Where the `check` command has the following options:

```
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
```

## License

This project is [licensed](./LICENSE) under MIT.
