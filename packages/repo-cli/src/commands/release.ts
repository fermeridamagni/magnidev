/**
 * @name Release
 * @file src/commands/release.ts
 * @description Creates a new Github Release for a project.
 */

import * as prompts from "@clack/prompts";
import * as path from "node:path";
import { Command } from "commander";
import colors from "picocolors";
import semver, { type ReleaseType } from "semver";

import type { Package } from "../types";
import { Repository } from "../lib/repository";
import { intro } from "../assets/intro";
import { generateNotes } from "../utils/notes";
import {
  appendMdFile,
  dirExists,
  writeJsonFile,
  writeMdFile,
} from "../utils/files";

export function releaseCommand(program: Command): void {
  program
    .command("release")
    .description("Creates a new release for a project")
    .action(async () => {
      console.clear();

      const repository = new Repository();

      try {
        let packages: Package[] = [];

        prompts.updateSettings({
          aliases: {
            w: "up",
            s: "down",
            a: "left",
            d: "right",
            esc: "cancel",
          },
        });

        prompts.intro(colors.white(intro));

        // Check if the repository is a git repository
        if (!(await repository.git.client.checkIsRepo())) {
          return onCancel("Not a git repository.");
        }

        if ((await repository.git.client.status()).files.length > 0) {
          return onCancel("Changes detected. Commit changes before releasing.");
        }

        // Fetch latest changes from remote
        await repository.git.client.fetch();

        // Get current branch
        const currentBranch = await repository.git.client.branch();
        const currentBranchName = currentBranch.current;

        // Check if local branch is behind remote
        const status = await repository.git.client.status();
        if (status.behind > 0) {
          const shouldPull = await prompts.confirm({
            message: `Your branch is ${status.behind} commit(s) behind the remote. Do you want to pull changes?`,
            initialValue: true,
          });

          if (prompts.isCancel(shouldPull)) {
            return onCancel("Operation cancelled by the user.");
          }

          if (shouldPull) {
            const pullSpinner = prompts.spinner();
            pullSpinner.start("Pulling changes from remote...");

            try {
              await repository.git.client.pull();
              pullSpinner.stop("Changes pulled successfully!");
            } catch (error: any) {
              pullSpinner.stop("Failed to pull changes!");
              return onCancel(`Error pulling changes: ${error.message}`);
            }
          }
        }

        if (repository.config.workspaces) {
          const foundMonorepoPackages =
            await repository.packages.findWorkspacePackages(process.cwd());

          if (!foundMonorepoPackages || foundMonorepoPackages.length === 0) {
            return onCancel("No packages found in the repository.");
          }

          packages = foundMonorepoPackages;
        } else {
          const foundPackage = await repository.packages.findPackage(
            process.cwd()
          );

          if (foundPackage === null) {
            return onCancel("No package found in the repository.");
          }

          packages = [foundPackage];
        }

        prompts.note(
          `name: ${colors.green(repository.config.name)}\nbranch: ${colors.green(
            currentBranchName
          )}`,
          "Repository information loaded successfully!"
        );

        const releaseConfig = await prompts.group(
          {
            shouldContinue: async () =>
              prompts.confirm({
                message: "Are you sure you want to continue?",
                initialValue: true,
              }),
            packageName: async ({ results }) => {
              if (!results.shouldContinue)
                return onCancel("Operation cancelled by the user.");

              if (repository.getRepoType() === "monorepo") {
                if (repository.config.release.versionStrategy === "fixed")
                  return undefined;

                return prompts.select({
                  message: "Which package would you like to release?",
                  options: packages.map((pkg) => ({
                    label: `${pkg.name} (${pkg.version})`,
                    value: pkg.name,
                    hint: pkg.dir,
                  })),
                  maxItems: 1,
                });
              }

              return packages[0].name;
            },
            releaseBump: async ({ results }) => {
              let foundPackage: Package;

              if (repository.getRepoType() === "monorepo") {
                if (!results.packageName)
                  return onCancel("No package selected.");

                foundPackage = packages.find(
                  (pkg) => pkg.name === results.packageName
                ) as Package;
              } else {
                foundPackage = packages[0];
              }

              return prompts.select({
                message: "Select release type",
                options: [
                  {
                    value: "major",
                    label: "Major",
                    hint: `${foundPackage.version} --> ${semver.inc(foundPackage.version, "major")}`,
                  },

                  {
                    value: "minor",
                    label: "Minor",
                    hint: `${foundPackage.version} --> ${semver.inc(foundPackage.version, "minor")}`,
                  },
                  {
                    value: "patch",
                    label: "Patch",
                    hint: `${foundPackage.version} --> ${semver.inc(foundPackage.version, "patch")}`,
                  },
                  {
                    value: "premajor",
                    label: "Pre Release",
                    hint: `${foundPackage.version} --> ${semver.inc(foundPackage.version, "premajor", "canary")}`,
                  },
                ],
                maxItems: 1,
              });
            },
            createDraft: async () =>
              prompts.confirm({
                message: "Create a draft release?",
                initialValue: false,
              }),
          },
          {
            onCancel: () => onCancel("Operation cancelled by the user."),
          }
        );

        if (!releaseConfig.shouldContinue)
          return onCancel("Operation cancelled by the user.");

        const afterSpin = prompts.spinner();
        afterSpin.start("Constructing release...");

        const foundPackage = packages.find(
          (pkg) => pkg.name === releaseConfig.packageName
        )!;

        // Determine version bump
        const newPackageVersion = semver.inc(
          foundPackage.version,
          releaseConfig.releaseBump as ReleaseType,
          "canary"
        )!;

        const commitTag: string =
          repository.config.release.versionStrategy === "independent"
            ? `${releaseConfig.packageName}@${newPackageVersion}`
            : `v${newPackageVersion}`;

        const tags = await repository.git.client.tags();
        const latestTag = tags.latest;

        const commits = await repository.git.client.log({
          from: latestTag,
        });

        const packageCommits = commits.all.filter((commit) => {
          return commit.message.includes(foundPackage.name);
        });

        if (packageCommits.length === 0) {
          afterSpin.stop("Process finished.");
          return onCancel("No commits found since last release.");
        }

        const notes = await generateNotes({
          commits: packageCommits,
        });

        await repository.git.client.addAnnotatedTag(commitTag, notes);
        await repository.git.client.pushTags("origin");

        const isPreRelease: boolean =
          semver.prerelease(newPackageVersion) !== null;

        await repository.github.createRelease({
          tag_name: commitTag,
          name: commitTag,
          body: notes,
          draft: releaseConfig.createDraft,
          prerelease: isPreRelease,
        });

        const packageJsonPath = path.join(foundPackage.dir, "package.json");

        await writeJsonFile(packageJsonPath, {
          ...foundPackage.packageJson,
          version: newPackageVersion,
        });

        const changelogPath = path.join(foundPackage.dir, "CHANGELOG.md");
        const changelogContent = `\n\n## ${commitTag}\n${notes}`;

        if (dirExists(changelogPath)) {
          await appendMdFile(changelogPath, changelogContent);
        } else {
          await writeMdFile(changelogPath, `# Changelog${changelogContent}`);
        }

        await repository.git.client.add([packageJsonPath, changelogPath]);

        await repository.git.client.commit(`chore(release): bump ${commitTag}`);
        await repository.git.client.push("origin", "main");

        afterSpin.stop("Process completed successfully!");

        prompts.note(commitTag, "Release completed successfully!");

        prompts.outro("Thank you for using Repo CLI! 🚀");
      } catch (error) {
        console.error("Error during release process:", error);
        return onCancel("An error occurred. Operation cancelled.");
      }
    });

  function onCancel(message?: string) {
    prompts.cancel(message ?? "Operation cancelled.");
    return process.exit(1);
  }
}
