/**
 * @name Repository
 * @file src/lib/repository.ts
 * @description Class to manage the repository configuration and packages
 */

import * as fs from "node:fs";
import * as path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

import type { Config } from "../types";
import { repoSchema } from "../schemas/repo.schema";
import { readJSON } from "../utils/files";
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

  /**
   * @description Get the repository configuration from package.json
   * @returns {Config} The repository configuration
   */
  private getConfig(): Config {
    const rootPackageJsonPath = path.join(process.cwd(), "package.json");

    if (!fs.existsSync(rootPackageJsonPath)) {
      this.logger.error(`No package.json found at: ${rootPackageJsonPath}`);
      process.exit(1);
    }

    const rootPackageJson = readJSON(rootPackageJsonPath);

    const { success, data, error } = repoSchema.safeParse({
      ...rootPackageJson,
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      },
    } as Config);

    if (!success) {
      this.logger.error(
        `Invalid configuration: missing required fields ${error.issues.map((issue) => `\n${issue.path.join(".")} ${issue.message}`).join(", ")}`
      );
      process.exit(1);
    }

    return data;
  }

  /**
   * @description Get the repository type (monorepo or single)
   * @returns {"monorepo" | "single"} The type of repository
   */
  public getRepoType(): "monorepo" | "single" {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const packageJson = readJSON(packageJsonPath);

    if (packageJson.workspaces) return "monorepo";

    return "single";
  }
}
