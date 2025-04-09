/**
 * Represents the configuration for the monorepo
 */
export interface Config {
  /**
   * Environment variables for the repository
   * @description The environment variables for the repository
   */
  env: {
    /**
     * Github token for authentication
     * @description The Github token for authentication
     */
    GITHUB_TOKEN: string;
    /**
     * Github repository URL
     * @description The Github repository URL
     */
    GITHUB_REPOSITORY_URL: string;
  };

  /**
   *  The type of the repository
   * @default monorepo
   * @description The type of the repository
   * - `monorepo`: A monorepo with multiple packages
   * - `single`: A single package repository
   */
  repoType: "monorepo" | "single";

  /**
   * Project configuration
   * @default independent
   * @description The versioning strategy for the packages
   * - `independent`: Each package has its own version
   * - `fixed`: All packages share the same version
   */
  versionStrategy: "independent" | "fixed";

  /**
   * The branch to use for the release
   * @default main
   * @description The branch to use for the release
   */
  branch: string;

  /**
   * Monorepo configuration
   * @description The directory where the packages are
   * @default packages
   *
   */
  packagesDir: string;
}

/**
 * Represents a package in the monorepo
 */
export interface Package {
  name: string; // Package name from package.json
  version: string; // Package version from package.json
  dir: string; // Absolute path to the package directory
  packageJson: any; // Parsed package.json content
}
