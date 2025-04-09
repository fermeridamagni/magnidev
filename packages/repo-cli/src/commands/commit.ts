/**
 * @name Commit
 * @file src/commands/commit.ts
 * @description Creates a new structured commit according to the Conventional Commits specification.
 */

import * as prompts from "@clack/prompts";
import { Command } from "commander";
import colors from "picocolors";

import type { Package } from "../types";
import { intro } from "../assets/intro";
import { Repository } from "../lib/repository";

export function commitCommand(program: Command): void {
  program
    .command("commit")
    .description(
      "Creates a new structured commit according to the Conventional Commits specification."
    )
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
          beforeSpin.stop("Not a git repository.");
          return onCancel("Not a git repository.");
        }

        if ((await repository.git.client.status()).files.length === 0) {
          beforeSpin.stop("No changes detected in the repository.");
          return onCancel("No changes detected. Operation cancelled.");
        }

        if (repository.config.repoType === "monorepo") {
          const foundMonorepoPackages =
            await repository.packages.findMonorepoPackages(process.cwd());

          if (foundMonorepoPackages.length === 0) {
            beforeSpin.stop("No packages found in the repository");
            return onCancel();
          }

          packages = foundMonorepoPackages;
        } else {
          const foundPackage = await repository.packages.findPackage(
            process.cwd()
          );

          if (foundPackage === null) {
            beforeSpin.stop("No package found in the repository");
            return onCancel();
          }

          packages = [foundPackage];
        }

        beforeSpin.stop("Repository information loaded successfully");

        const commitConfig = await prompts.group(
          {
            packageName: async () => {
              if (repository.config.repoType === "monorepo") {
                return prompts.select({
                  message: "Which package would you like to commit?",
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
            commitType: async () =>
              prompts.select({
                message: "What type of commit is this?",
                options: [
                  {
                    label: "Feature",
                    value: "feat",
                    hint: "A new feature",
                  },
                  {
                    label: "Fix",
                    value: "fix",
                    hint: "A bug fix",
                  },
                  {
                    label: "Chore",
                    value: "chore",
                    hint: "Other changes that don't modify src or test files",
                  },
                  {
                    label: "Docs",
                    value: "docs",
                    hint: "Documentation only changes",
                  },
                  {
                    label: "Style",
                    value: "style",
                    hint: "Changes that do not affect the meaning of the code",
                  },
                  {
                    label: "Refactor",
                    value: "refactor",
                    hint: "A code change that neither fixes a bug nor adds a feature",
                  },
                  {
                    label: "Perf",
                    value: "perf",
                    hint: "A code change that improves performance",
                  },
                  {
                    label: "Test",
                    value: "test",
                    hint: "Adding missing tests or correcting existing tests",
                  },
                  {
                    label: "Build",
                    value: "build",
                    hint: "Changes that affect the build system or external dependencies",
                  },
                  {
                    label: "CI",
                    value: "ci",
                    hint: "Changes to our CI configuration files and scripts",
                  },
                  {
                    label: "Revert",
                    value: "revert",
                    hint: "Reverts a previous commit",
                  },
                ],
                maxItems: 1,
              }),
            commitScope: async ({ results }) => {
              if (repository.config.repoType !== "monorepo") return undefined;

              if (repository.config.versionStrategy === "independent")
                return results.packageName;

              return prompts.text({
                message: "Enter a commit scope",
                validate: (input) =>
                  input.length > 0 ? undefined : "Scope is required",
              });
            },
            commitShortDescription: async () =>
              prompts.text({
                message: "Enter a commit message",
                validate: (input) =>
                  input.length > 0 ? undefined : "Commit message is required",
              }),
            commitLongDescription: async () =>
              prompts.text({
                message: "Enter a longer commit description (optional)",
              }),
            commitHasBreakingChanges: async () =>
              prompts.confirm({
                message: "Does this commit introduce breaking changes?",
                initialValue: false,
              }),
            commitBreakingChangesDescription: async ({ results }) => {
              if (results.commitHasBreakingChanges) {
                return prompts.text({
                  message: "Enter a description of the breaking changes",
                  validate: (input) =>
                    input.length > 0
                      ? undefined
                      : "Breaking changes description is required",
                });
              }
              return undefined;
            },
            shouldPush: async () =>
              prompts.confirm({
                message: "Would you like to push the commit to the remote?",
                initialValue: true,
              }),
          },
          {
            onCancel: () => onCancel("Operation cancelled by the user."),
          }
        );

        const afterSpin = prompts.spinner();
        afterSpin.start("Constructing commit...");

        // Construct project message
        const commitScope: string = commitConfig.commitScope
          ? `(${commitConfig.commitScope})`.trim()
          : "";
        const commitPrefix: string = `${commitConfig.commitType}${commitScope}`;
        const commitMessage: string = `${commitPrefix}: ${commitConfig.commitShortDescription}${commitConfig.commitLongDescription ? "\n\n" + commitConfig.commitLongDescription : ""}${commitConfig.commitHasBreakingChanges ? "\n\n" + `BREAKING CHANGES: ${commitConfig.commitBreakingChangesDescription}` : ""}`;

        // Stage changes
        await repository.git.client.add(".");

        // Commit changes
        await repository.git.client.commit(commitMessage);

        if (commitConfig.shouldPush)
          await repository.git.client.push("origin", repository.config.branch);

        afterSpin.stop("Process completed successfully!");

        prompts.note(
          commitMessage,
          colors.green("Commit completed successfully!")
        );

        prompts.outro("Thank you for using Repo CLI! 🚀");
      } catch (error) {
        console.error("Error:", error);
        return onCancel("An error occurred. Operation cancelled.");
      }
    });

  function onCancel(message?: string) {
    prompts.cancel(message || "Operation cancelled.");
    process.exit(0);
  }
}
