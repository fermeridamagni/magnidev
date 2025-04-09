import { z } from "zod";

export const repoSchema = z.object({
  /**
   * Environment variables for the repository
   * @description The environment variables for the repository
   * @default null
   */
  env: z.object({
    /**
     * Github token for authentication
     * @description The Github token for authentication
     * @default null
     */
    GITHUB_TOKEN: z.string().min(1),
  }),

  /**
   * @description The name of the repository
   * @default null
   */
  name: z.string().min(1),

  /**
   * @description The release configuration for the repository
   * @default null
   */
  release: z.object({
    /**
     * @description The branch to use for the release
     * @default null
     */
    branches: z.array(
      z.object({
        /**
         * @description The name of the branch
         * @default null
         */
        name: z.string().min(1),
        /**
         * @description The type of the branch
         * @default null
         */
        prerelease: z.boolean(),
        /**
         * @description The channel for the release
         * @default null
         */
        channel: z.string().optional(),
      })
    ),

    /**
     * @description The repository URL for the release
     * @default null
     */
    repositoryUrl: z.string().url().min(1),

    /**
     * @description The versioning strategy for the packages. Require a MonoRepo
     * - independent: Each package has its own version
     * - fixed: All packages share the same version
     * @default null
     */
    versionStrategy: z.enum(["independent", "fixed"]),
  }),

  /**
   * @description The directory where the packages are located
   * @default null
   */
  workspaces: z.array(z.string()),
});
