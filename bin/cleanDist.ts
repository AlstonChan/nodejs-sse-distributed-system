// Nodejs module
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// External module
import { red, green } from "colorette";
import ora from "ora";

// Constants
const distDir = path.resolve(__dirname, "../dist");

const main = async () => {
  // Check if dist directory exists
  const distDirExists = existsSync(distDir);

  if (!distDirExists) {
    console.log(
      green("INFO"),
      "The dist directory does not exist, nothing to clean!"
    );
    return;
  }

  const spinner = ora({
    text: "Cleaning dist directory...",
    color: "yellow",
  }).start(); // Start the spinner

  try {
    await fs.rm(distDir, { recursive: true, force: true });
    spinner.succeed("Dist directory cleaned successfully!");
  } catch (error) {
    spinner.fail("Failed to clean dist directory!");
    console.error(red("ERROR"), error);
  }
};
main();
