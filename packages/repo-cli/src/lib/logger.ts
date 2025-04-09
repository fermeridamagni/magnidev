/**
 * @name Logger
 * @file src/lib/logger.ts
 * @description Logger class to log styled messages to the console
 */

import colors from "picocolors";

/**
 * Logger class to log messages to the console
 */
export class Logger {
  /**
   * Logs a message to the console
   * @param message
   */
  public log(message: any) {
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    console.log(message);
  }

  /**
   * Logs an error message to the console
   * @param message
   */
  public error(message: any) {
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    console.error(`${colors.bgRed("Error:")} ${colors.red(message)}`);
  }

  /**
   * Logs a success message to the console
   * @param message
   */
  public success(message: any) {
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    console.log(`${colors.bgGreen("Success:")} ${colors.green(message)}`);
  }

  /**
   * Logs an info message to the console
   * @param message
   */
  public info(message: any) {
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    console.log(`${colors.bgBlue("Info:")} ${colors.blue(message)}`);
  }

  /**
   * Logs a warning message to the console
   * @param message
   */
  public warning(message: any) {
    if (typeof message !== "string") {
      message = JSON.stringify(message, null, 2);
    }
    console.warn(`${colors.bgYellow("Warning:")} ${colors.yellow(message)}`);
  }
}
