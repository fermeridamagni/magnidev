/**
 * @name Git
 * @file src/lib/git.ts
 * @description Class to manage git operations and repository information
 */

import simpleGit, { type SimpleGit } from "simple-git";
import { Logger } from "./logger";

export class Git {
  private logger: Logger;
  public client: SimpleGit;

  constructor() {
    this.client = simpleGit(process.cwd());
    this.logger = new Logger();
  }

  /**
   * Checks if the current directory is a git repository
   * @returns {boolean} - True if the current directory is a git repository, false otherwise
   */
  async isRepo(): Promise<boolean> {
    try {
      await this.client.checkIsRepo();
      return true;
    } catch (e) {
      return false;
    }
  }
}
