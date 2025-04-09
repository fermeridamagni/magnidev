/**
 * @name Github
 * @file src/lib/github.ts
 * @description Class to manage the Github API and repository information
 */

import { Octokit, type RestEndpointMethodTypes } from "@octokit/rest";

import type { Config } from "../types";

export class Github {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  public async createRelease({
    tagName,
    name,
    body,
    draft = false,
    preRelease = false,
  }: {
    tagName: string;
    name: string;
    body: string;
    draft: boolean;
    preRelease: boolean;
  }): Promise<void> {
    try {
      const [owner, repo] =
        this.config.env.GITHUB_REPOSITORY_URL.split("/").slice(-2);

      const octokit = new Octokit({
        auth: this.config.env.GITHUB_TOKEN,
      });

      const { status } = await octokit.repos.createRelease({
        owner,
        repo,
        tag_name: tagName,
        name,
        body,
        draft,
        prerelease: preRelease,
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
