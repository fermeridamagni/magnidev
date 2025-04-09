import * as fs from "node:fs";

export const dirExists = (path: string): boolean => {
  try {
    return fs.existsSync(path);
  } catch {
    return false;
  }
};

/**
 * @description Reads a JSON file and returns the parsed content
 * @param file - The path to the JSON file
 * @returns The parsed JSON content
 */
export const readJSON = (filePath: string) =>
  JSON.parse(fs.readFileSync(filePath, "utf8"));

/**
 * @description Reads a file asynchronously and returns the parsed JSON content
 * @param filePath - The path to the JSON file
 * @returns A promise that resolves to the parsed JSON content
 */

export const readAsync = async (filePath: string): Promise<any> => {
  // Read the file asynchronously
  // Use 'utf8' encoding to ensure the file is read as a text file
  const data = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(data);
};

/**
 * @description Writes data to a file asynchronously
 * @param filePath - The path to the file
 * @param data - The data to write to the file
 * @returns A promise that resolves when the write operation is complete
 */
export const writeAsync = async (
  filePath: string,
  data: string
): Promise<void> => {
  // Write the file asynchronously
  // Use 'utf8' encoding to ensure the file is written as a text file
  await fs.promises.writeFile(filePath, data, "utf8");
};
