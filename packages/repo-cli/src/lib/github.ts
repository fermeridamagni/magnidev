/**
 * @name Github
 * @file src/lib/github.ts
 * @description Class to manage the Github API and repository information
 */

import { Octokit } from "@octokit/rest";

import type { Config } from "../types";

export class Github {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public async createRelease({
    tag_name,
    name,
    body,
    draft = false,
    prerelease = false,
  }: {
    tag_name: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
  }): Promise<void> {
    try {
      const [owner, repo] = this.config.release.repositoryUrl
        .split("/")
        .slice(-2);

      const octokit = new Octokit({
        auth: this.config.env.GITHUB_TOKEN,
      });

      const { status } = await octokit.repos.createRelease({
        owner,
        repo,
        tag_name,
        name,
        body,
        draft,
        prerelease,
      });

      if (status !== 201) {
        throw new Error("Failed to create release on Github");
      }
    } catch (error) {
      console.error("Error creating release:", error);
      throw new Error("Failed to create release on Github");
    }
  }
}
