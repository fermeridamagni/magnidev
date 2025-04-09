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

        // Check if the repository is a git repository
        if (!(await repository.git.client.checkIsRepo())) {
          return onCancel("Not a git repository.");
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

        // Check if the repository does not have any changes or uncommitted files
        if ((await repository.git.client.status()).files.length === 0) {
          return onCancel("No changes detected. Operation cancelled.");
        }

        if (repository.getRepoType() === "monorepo") {
          const foundWorkspacePackages =
            await repository.packages.findWorkspacePackages(process.cwd());

          if (!foundWorkspacePackages || foundWorkspacePackages.length === 0) {
            return onCancel("No packages found in the repository");
          }

          packages = foundWorkspacePackages;
        } else {
          const foundPackage = await repository.packages.findPackage(
            process.cwd()
          );

          if (foundPackage === null) {
            return onCancel("No package found in the repository");
          }

          packages = [foundPackage];
        }

        prompts.note(
          `name: ${colors.green(repository.config.name)}\nbranch: ${colors.green(
            currentBranchName
          )}`,
          "Repository information loaded successfully!"
        );

        const commitConfig = await prompts.group(
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
              if (repository.getRepoType() !== "monorepo") return undefined;

              if (repository.config.release.versionStrategy === "independent")
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
          await repository.git.client.push("origin", "main");

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
