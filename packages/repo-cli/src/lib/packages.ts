/**
 * @name Packages
 * @file src/lib/packages.ts
 * @description Class to find and manage packages in a repository
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { Package, Config } from "../types";
import { readJSON } from "../utils";

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
    if (!fs.existsSync(dir)) return null;

    const packageJsonPath = path.join(dir, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = readJSON(packageJsonPath);
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
  async findMonorepoPackages(dir: string): Promise<Package[]> {
    if (!fs.existsSync(dir)) return [];

    const packagesDir = path.join(dir, this.config.packagesDir);

    if (!fs.existsSync(packagesDir)) return [];

    const dirs = fs
      .readdirSync(packagesDir)
      .filter((foundDir) =>
        fs.statSync(path.join(packagesDir, foundDir)).isDirectory()
      );

    return dirs
      .map((foundDir) => {
        const packageJsonPath = path.join(
          packagesDir,
          foundDir,
          "package.json"
        );

        if (fs.existsSync(packageJsonPath)) {
          const packageJson = readJSON(packageJsonPath);

          return {
            name: packageJson.name,
            version: packageJson.version,
            dir: path.join(packagesDir, foundDir),
            packageJson,
          };
        }
        return null;
      })
      .filter((pkg): pkg is Package => pkg !== null);
  }
}
