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

## Usage in CI/CD Environments

### GitHub

Use the available GitHub Action [check-outdated-ui5-version](https://github.com/DevEpos/check-outdated-ui5-version)

### GitLab
  
You can utilize the CLI to setup a custom pipeline to check/fix outdated UI5 versions in `manifest.json`

#### Example to check on push or merge request to default branch

```yaml
stages:
  - check_ui5  

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && ( $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main" )
      when: always
    - if: $CI_COMMIT_BRANCH == "main" || $CI_COMMIT_BRANCH == "hotfix"
      when: always
    - when: never

"Check for outdated UI5 Versions":
  stage: check_ui5
  image: node:22-alpine 
  before_script: |
    npm i -g ui5-version-check@0.2.0
  script: |
    ui5vc c -p .
```

#### Example to periodically update outdated versions via merge request

In GitLab the schedule is defined via a custom setting under menu `Build` of the repository. To only run the stages during the scheduled execution you can add a custom variable (e.g. `UI5_VERSION_UPDATE`) to the schedule.

```yaml
stages:
  - fix_ui5
  - create_mr_for_version_fix

workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event" && ( $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "main" || $CI_MERGE_REQUEST_TARGET_BRANCH_NAME == "hotfix" )
      when: always
    - if: $CI_COMMIT_BRANCH == "main" || $CI_COMMIT_BRANCH == "hotfix"
      when: always
    - when: never

variables:
  GIT_AUTHOR_NAME: "CI Bot"
  GIT_AUTHOR_EMAIL: "ci@example.com"
  GIT_COMMITTER_NAME: "CI Bot"
  GIT_COMMITTER_EMAIL: "ci@example.com"

"Fix outdated UI5 Versions":
  stage: fix_ui5
  image: node:22-alpine
  rules:
    - if: $UI5_VERSION_UPDATE
      when: always
    - when: never
  before_script: |
    npm i -g ui5-version-check@0.2.0
    apk add --no-cache git curl bash
    git config --global user.email "$GIT_AUTHOR_EMAIL"
    git config --global user.name "$GIT_AUTHOR_NAME"
    git remote set-url origin https://oauth2:${AUTOMATION_TOKEN}@${CI_PROJECT_URL#https://}.git
  script: |
    git checkout -b chore/fix-ui5-versions
    ui5vc c -p . -f
    git add -A
    git commit -m"chore: fixes outdated ui5 versions"
    git push origin HEAD:chore/fix-ui5-versions

"Create MR to fix UI5 Versions":
  stage: create_mr_for_version_fix
  image: curlimages/curl:latest
  rules:
    - if: '$UI5_VERSION_UPDATE'
      when: always
    - when: never  
  script:
    - |
      curl --request POST "https://$CI_SERVER_HOST/api/v4/projects/$CI_PROJECT_ID/merge_requests" \
        --header "PRIVATE-TOKEN: $AUTOMATION_TOKEN" \
        --form "source_branch=chore/fix-ui5-versions" \
        --form "target_branch=main" \
        --form "title=CI: Update UI5 versions"

```
