/**
 * @name Repository
 * @file src/lib/repository.ts
 * @description Class to manage the repository configuration and packages
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import type { DefaultLogFields, ListLogLine } from "simple-git";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import type { Config } from "../types";
import { readJSON } from "../utils";
import { Packages } from "./packages";
import { Logger } from "./logger";
import { Git } from "./git";
import { Github } from "./github";

export class Repository {
  public logger: Logger = new Logger();
  public config: Config;
  public packages: Packages;
  public git: Git;
  public github: Github;

  constructor() {
    this.config = this.getConfig();
    this.git = new Git();
    this.github = new Github(this.config);
    this.packages = new Packages(this.config);
  }

  private getConfig(): Config {
    const configFileDir = path.join(process.cwd(), ".repo", "config.json");

    if (!fs.existsSync(configFileDir)) {
      this.logger.error("Configuration file not found at " + configFileDir);
      process.exit(1);
    }

    const repoConfigSchema = repoSchema.safeParse({
      ...readJSON(configFileDir),
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GITHUB_REPOSITORY_URL: process.env.GITHUB_REPOSITORY_URL,
      },
    });

    if (!repoConfigSchema.success) {
      this.logger.error(
        `Invalid configuration: missing required fields ${repoConfigSchema.error.issues.map((issue) => `\n${issue.path.join(".")} ${issue.message}`).join(", ")}`
      );
      process.exit(1);
    }

    return repoConfigSchema.data;
  }

  /**
   * @description Generates the notes for the release based on the commit messages
   * @param version - The version of the release
   * @param commits - The list of commits to include in the release notes
   * @returns The release notes as a string
   */
  public async generateNotes({
    version,
    commits,
  }: {
    version: string;
    commits: (DefaultLogFields & ListLogLine)[];
  }): Promise<string> {
    let notes: string = `## ${version} (${new Date().toLocaleDateString()})\n\n`;

    const authors = new Set<{
      name: string;
      commits: string[];
    }>();

    commits.forEach((commit) => {
      const commitAuthor = commit.author_name;

      // if the author is not in the set, add it
      if (!Array.from(authors).some((author) => author.name === commitAuthor)) {
        authors.add({
          name: commitAuthor,
          commits: [],
        });
      }

      // add the commit to the author's commits if it doesn't exist
      const author = Array.from(authors).find(
        (author) => author.name === commitAuthor
      );
      if (author) author.commits.push(commit.hash);
    });

    notes += `### Changes\n`;
    commits.forEach((commit) => {
      notes += `- ${commit.message} (${commit.hash})\n`;
    });

    return notes;
  }
}

const repoSchema = z.object({
  /**
   * Environment variables for the repository
   * @description The environment variables for the repository
   */
  env: z.object({
    /**
     * Github token for authentication
     * @description The Github token for authentication
     */
    GITHUB_TOKEN: z.string().min(1, { message: "GITHUB_TOKEN is required" }),
    /**
     * Github repository URL
     * @description The Github repository URL
     */
    GITHUB_REPOSITORY_URL: z
      .string()
      .url({ message: "GITHUB_REPOSITORY_URL is required" }),
  }),

  /**
   *  The type of the repository
   * @default monorepo
   * @description The type of the repository
   * - monorepo: A monorepo with multiple packages
   * - single: A single package repository
   */
  repoType: z.enum(["monorepo", "single"]).default("monorepo"),

  /**
   * Project configuration
   * @default independent
   * @description The versioning strategy for the packages
   * - independent: Each package has its own version
   * - fixed: All packages share the same version
   */
  versionStrategy: z.enum(["independent", "fixed"]).default("independent"),

  /**
   * The branch to use for the release
   * @default main
   * @description The branch to use for the release
   */
  branch: z.string().min(1, { message: "Branch is required" }).default("main"),

  /**
   * Monorepo configuration
   * @description The directory where the packages are
   * @default packages
   */
  packagesDir: z
    .string()
    .min(1, { message: "Packages directory is required" })
    .default("packages"),
});
