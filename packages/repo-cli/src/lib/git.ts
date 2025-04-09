/**
 * @name Git
 * @file src/lib/git.ts
 * @description Class to manage git operations and repository information
 */

import simpleGit, { type SimpleGit } from "simple-git";

export class Git {
  public client: SimpleGit;

  constructor() {
    this.client = simpleGit(process.cwd());
  }
}
