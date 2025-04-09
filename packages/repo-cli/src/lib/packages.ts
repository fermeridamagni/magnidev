/**
 * @name Packages
 * @file src/lib/packages.ts
 * @description Class to find and manage packages in a repository
 */

import fg from "fast-glob";
import * as path from "node:path";

import type { Package, Config } from "../types";
import { readJsonFile, dirExists } from "../utils/files";

export class Packages {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Finds a package in the specified directory
   * @param dir Directory to search for package.json
   * @returns {Package | null} Package object or null if not found
   */
  async findPackage(dir: string): Promise<Package | null> {
    if (!dirExists(dir)) return null;

    const packageJsonPath = path.join(dir, "package.json");

    if (dirExists(packageJsonPath)) {
      const packageJson = await readJsonFile(packageJsonPath);
      return {
        name: packageJson.name,
        version: packageJson.version,
        dir,
        packageJson,
      };
    }

    return null;
  }

  /**
   * Finds all packages in the monorepo
   * @param dir Directory to search for packages
   * @returns {Package[]} List of package directories
   */
  async findWorkspacePackages(dir: string): Promise<Package[] | null> {
    if (!dirExists(dir)) return null;

    // example of workspaces: ["packages/*"]
    const workspaces = this.config.workspaces || [];
    const packages: Package[] = [];

    for (const workspace of workspaces) {
      const packageDirs = await fg([workspace], {
        cwd: dir,
        onlyDirectories: true,
      });

      for (const packageDir of packageDirs) {
        const packagePath = path.join(dir, packageDir);
        const pkg = await this.findPackage(packagePath);
        if (pkg) packages.push(pkg);
      }
    }

    return packages;
  }
}
