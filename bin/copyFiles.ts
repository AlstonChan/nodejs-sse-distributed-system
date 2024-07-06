// Nodejs module
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

// External module
import { yellow, red } from "colorette";
import ora from "ora";

// Constants
const viewsDir = path.resolve(__dirname, "../src/views");
const distDir = path.resolve(__dirname, "../dist");

// Helper function
const copyFiles = async (src: string, destination: string) => {
  await fs.copyFile(src, destination);
};

const copyDir = async (src: string, destination: string) => {
  await fs.mkdir(destination, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(destination, entry.name);

    entry.isDirectory()
      ? await copyDir(srcPath, destPath)
      : await copyFiles(srcPath, destPath);
  }
};

const copyViewsDir = async () => {
  // Check if the views directory exists
  const viewsDirExists = existsSync(viewsDir);

  if (!viewsDirExists) {
    console.log(red("ERROR"), "The views directory does not exist!");
  }

  // removes the views directory from the dist directory
  // to have a clean start
  const distViewsDir = path.join(distDir, "views");
  await fs.rm(distViewsDir, { recursive: true, force: true });

  // Copy the views directory to the dist directory
  const stats = await fs.stat(viewsDir);
  if (stats.isDirectory()) {
    await copyDir(viewsDir, distViewsDir);
  } else {
    await copyFiles(viewsDir, distViewsDir);
  }
};

const main = async () => {
  // Check if dist directory exists
  const distDirExists = existsSync(distDir);

  if (!distDirExists) {
    console.log(
      yellow("WARN"),
      "The dist directory does not exist, creating it now..."
    );
    await fs.mkdir(distDir);
  }

  // Copy the views directory
  const spinner = ora("Copying views files...").start();
  try {
    await copyViewsDir();
    spinner.succeed("Views files copied successfully!");
  } catch (error) {
    spinner.fail("Failed to copy views files!");
  }
};
main();
