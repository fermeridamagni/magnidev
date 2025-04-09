import * as fs from "node:fs";

/**
 * Reads a JSON file and returns the parsed content
 * @param file - The path to the JSON file
 * @returns The parsed JSON content
 */
export const readJSON = (filePath: string) =>
  JSON.parse(fs.readFileSync(filePath, "utf8"));
