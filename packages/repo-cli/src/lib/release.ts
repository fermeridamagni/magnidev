import path from "node:path";

export class Release {
  constructor() {}

  /**
   * Release a package
   * @param packageName Name of the package to release
   * @param version Version to release
   * @param options Options for the release
   */
  async releasePackage(
    packageName: string,
    version: string,
    options: {
      createDraft?: boolean;
    }
  ): Promise<void> {
    const { createDraft } = options;

    // Check if the package exists
    const packagePath = path.join(process.cwd(), packageName);
  }
}
