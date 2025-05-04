let logger: Logger | undefined;

export type Logger = Pick<typeof console, "info" | "group" | "groupEnd" | "warn" | "error"> & {
  notice: (typeof console)["info"];
};

/**
 * Sets custom logger for use during version validation
 */
export function setLogger(l: Logger) {
  logger = l;
}

/**
 * Retrieves logger. If no custom logger has been set `console` will be
 * the default logging output
 */
export function getLogger() {
  if (!logger)
    logger = {
      info: console.info,
      group: console.group,
      groupEnd: console.groupEnd,
      warn: console.warn,
      error: console.error,
      notice: console.info
    };
  return logger;
}
