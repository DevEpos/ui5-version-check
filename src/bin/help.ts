const helpText = `
USAGE

    ui5vc <command> [<args>]

COMMANDS

    c | check    checks UI5 versions
    h | help     prints cli help or help for commands
    v | version  prints version information

Learn more about each command using:
ui5vc help <command>
ui5vc h <command>
`;

export default {
  help: () => console.log(helpText)
};
