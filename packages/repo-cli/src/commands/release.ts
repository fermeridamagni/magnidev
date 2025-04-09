/**
 * @name Release
 * @file src/commands/release.ts
 * @description Creates a new Github Release for a project.
 */

import * as prompts from "@clack/prompts";
import * as path from "node:path";
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import { Command } from "commander";
import colors from "picocolors";
import semver, { type ReleaseType } from "semver";

import type { Package } from "../types";
import { Repository } from "../lib/repository";
import { intro } from "../assets/intro";

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

        const beforeSpin = prompts.spinner();
        beforeSpin.start("Getting package information");

        if (!(await repository.git.isRepo())) {
          beforeSpin.stop("Process finished.");
          return onCancel("Not a git repository.");
        }

        if ((await repository.git.client.status()).files.length > 0) {
          beforeSpin.stop("Process finished.");
          return onCancel("Changes detected. Commit changes before releasing.");
        }

        if (repository.config.repoType === "monorepo") {
          const foundMonorepoPackages =
            await repository.packages.findMonorepoPackages(process.cwd());

          if (foundMonorepoPackages.length === 0) {
            beforeSpin.stop("Process finished.");
            return onCancel("No packages found in the repository.");
          }

          packages = foundMonorepoPackages;
        } else {
          const foundPackage = await repository.packages.findPackage(
            process.cwd()
          );

          if (foundPackage === null) {
            beforeSpin.stop("Process finished.");
            return onCancel("No package found in the repository.");
          }

          packages = [foundPackage];
        }

        beforeSpin.stop("Repository information loaded successfully");

        const releaseConfig = await prompts.group(
          {
            packageName: async () => {
              if (repository.config.repoType === "monorepo") {
                if (repository.config.versionStrategy === "fixed")
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

              if (repository.config.repoType === "monorepo") {
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
            shouldContinue: async ({ results }) => {
              // If the user wants to create a draft release, we don't need to ask for confirmation
              if (results.createDraft) return true;

              return prompts.confirm({
                message: "Are you sure you want to continue?",
                initialValue: true,
              });
            },
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
          repository.config.repoType === "monorepo" &&
          repository.config.versionStrategy === "independent"
            ? `${releaseConfig.packageName}@${newPackageVersion}`
            : `v${newPackageVersion}`;

        const tags = await repository.git.client.tags();
        const latestTag = tags.latest;

        const commits = await repository.git.client.log({
          from: latestTag,
        });

        if (commits.all.length === 0) {
          afterSpin.stop("Process finished.");
          return onCancel("No commits found since last release.");
        }

        const notes = await repository.generateNotes({
          version: commitTag,
          commits: commits.all.map((commit) => ({
            ...commit,
          })),
        });

        await repository.git.client.addAnnotatedTag(commitTag, notes);
        await repository.git.client.pushTags("origin");

        const isPreRelease: boolean =
          semver.prerelease(newPackageVersion) !== null;

        // #region Create release
        await repository.github.createRelease({
          tagName: commitTag,
          name: commitTag,
          body: notes,
          draft: releaseConfig.createDraft,
          preRelease: isPreRelease,
        });

        // #region Update package.json
        const packageJsonPath = path.join(foundPackage.dir, "package.json");

        await fsPromises.writeFile(
          packageJsonPath,
          JSON.stringify(
            {
              ...foundPackage.packageJson,
              version: newPackageVersion,
            },
            null,
            2
          )
        );

        // #region Update changelog
        const changelogPath = path.join(foundPackage.dir, "CHANGELOG.md");

        if (fs.existsSync(changelogPath)) {
          const foundChangelog = fs.readFileSync(changelogPath, "utf-8");

          const newChangelog = `${foundChangelog}\n\n${notes}`;

          await fsPromises.writeFile(changelogPath, newChangelog, "utf-8");
        } else {
          await fsPromises.writeFile(
            changelogPath,
            `# Changelog\n\n${notes}`,
            "utf-8"
          );
        }

        await repository.git.client.add([packageJsonPath, changelogPath]);

        await repository.git.client.commit(`chore(release): bump ${commitTag}`);
        await repository.git.client.push("origin", repository.config.branch);

        afterSpin.stop("Process completed successfully!");

        prompts.note(commitTag, "Release completed successfully!");
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
