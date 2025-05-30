import type { Commit } from "../types";

/**
 * @description Generates the notes for the release based on the commit messages
 * @param version - The version of the release
 * @param commits - The list of commits to include in the release notes
 * @returns The release notes as a string
 */
export const generateNotes = async ({
  commits,
  version,
}: {
  commits: Commit[];
  version: string;
}): Promise<string> => {
  let notes: string = "";

  const authors = new Set<{
    name: string;
    commits: string[];
  }>();

  commits.forEach((commit) => {
    const commitAuthor = commit.author_name;

    // if the author is not in the set, add it
    if (!Array.from(authors).some((author) => author.name === commitAuthor)) {
      authors.add({
        name: commitAuthor,
        commits: [],
      });
    }

    // add the commit to the author's commits if it doesn't exist
    const author = Array.from(authors).find(
      (author) => author.name === commitAuthor
    );
    if (author) author.commits.push(commit.hash);
  });

  notes += `\n### Changes (${version})\n`;
  commits.forEach((commit) => {
    notes += `\n- ${commit.message} (${commit.hash})\n`;
  });

  return notes;
};
