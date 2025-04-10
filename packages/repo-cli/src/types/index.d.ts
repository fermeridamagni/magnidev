import { z } from "zod";
import type { DefaultLogFields, ListLogLine } from "simple-git";

import { repoSchema } from "../schemas/repo.schema";

/**
 * @description Represents the configuration for the repository
 */
export type Config = z.infer<typeof repoSchema>;

/**
 * Represents a package in the monorepo
 */
export type Package = {
  dir: string;
  name: string;
  version: string;
  packageJson: Record<string, any>;
};

export type Commit = DefaultLogFields & ListLogLine;
