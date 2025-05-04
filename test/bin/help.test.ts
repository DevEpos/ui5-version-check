import help from "../../src/bin/help";

const mockLog = jest.spyOn(console, "log").mockImplementation(() => {});

describe("help", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should print the help text", () => {
    help.exec();
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("USAGE"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("COMMANDS"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("ui5vc <command> [<args>]"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("c | check    checks UI5 versions"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("h | help     prints cli help or help for commands"));
    expect(mockLog).toHaveBeenCalledWith(expect.stringContaining("v | version  prints version information"));
  });
});
