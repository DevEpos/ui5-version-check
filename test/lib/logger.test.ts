import { setLogger, getLogger, Logger } from "../../src/lib/utils";

describe("Logger Utility", () => {
  afterEach(() => {
    // Reset the logger after each test
    setLogger(undefined as unknown as Logger);
  });

  it("should return the default logger if no custom logger is set", () => {
    const logger = getLogger();

    expect(logger.info).toBe(console.info);
    expect(logger.group).toBe(console.group);
    expect(logger.groupEnd).toBe(console.groupEnd);
    expect(logger.warn).toBe(console.warn);
    expect(logger.error).toBe(console.error);
    expect(logger.notice).toBe(console.info);
  });

  it("should return the custom logger when set", () => {
    const customLogger: Logger = {
      info: jest.fn(),
      group: jest.fn(),
      groupEnd: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      notice: jest.fn()
    };

    setLogger(customLogger);
    const logger = getLogger();

    expect(logger).toBe(customLogger);
    expect(logger.info).toBe(customLogger.info);
    expect(logger.notice).toBe(customLogger.notice);
  });

  it("should fallback to the default logger if setLogger is called with undefined", () => {
    setLogger(undefined as unknown as Logger);
    const logger = getLogger();

    expect(logger.info).toBe(console.info);
    expect(logger.group).toBe(console.group);
    expect(logger.groupEnd).toBe(console.groupEnd);
    expect(logger.warn).toBe(console.warn);
    expect(logger.error).toBe(console.error);
    expect(logger.notice).toBe(console.info);
  });
});
