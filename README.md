# UI5 Version Check

[![npm version](https://img.shields.io/npm/v/ui5-version-check.svg?style=flat)](https://www.npmjs.com/package/ui5-version-check)
![CI](https://github.com/DevEpos/ui5-version-check/actions/workflows/ci.yml/badge.svg)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

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

The `check` command allows the validation and fixing of UI5 versions in `manifest.json` files in the section `sap.platform.cf/ui5VersionNumber`.

### Options for the `check` command

```
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

## JavaScript API

Alongside the CLI there is also a public [API](https://devepos.com/ui5-version-check) in this package, so the version check can be easily used in other tooling.

### Packages that use the API

- [check-outdated-ui5-version](https://github.com/DevEpos/check-outdated-ui5-version)  
  GitHub Action to Check/update UI5 versions for use in Cloud Foundry