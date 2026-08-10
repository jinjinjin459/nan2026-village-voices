import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const errors = [];

const requiredFiles = [
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "src/main.tsx",
  "src/App.tsx",
];

const ignoredDirectories = new Set([
  ".git",
  ".runtime",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const sourceAndDocumentExtensions = new Set([
  ".css",
  ".env",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const secretPatterns = [
  {
    label: "Google API key",
    pattern: new RegExp(["AI", "za", "[A-Za-z0-9_-]{30,}"].join(""), "g"),
  },
  {
    label: "AQ token",
    pattern: new RegExp(["A", "Q", "\\.", "[A-Za-z0-9_-]{24,}"].join(""), "g"),
  },
];

const unfinishedMarkerLabels = [["TO", "DO"].join(""), ["PLACE", "HOLDER"].join("")];
const unfinishedMarkerPattern = new RegExp(
  `\\b(?:${unfinishedMarkerLabels.join("|")})\\b`,
  "g",
);

async function exists(relativePath) {
  try {
    await stat(path.join(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

for (const relativePath of requiredFiles) {
  if (!(await exists(relativePath))) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

if (!(await exists("dist/index.html"))) {
  errors.push("Missing build entry: dist/index.html (run npm run build first)");
}

const assetsDirectory = path.join(projectRoot, "dist", "assets");
try {
  const assetEntries = await readdir(assetsDirectory, { withFileTypes: true });
  if (!assetEntries.some((entry) => entry.isFile())) {
    errors.push("Build assets directory is empty: dist/assets");
  }
} catch {
  errors.push("Missing build assets directory: dist/assets");
}

const files = await collectFiles(projectRoot);
const scannableFiles = files.filter((filePath) =>
  sourceAndDocumentExtensions.has(path.extname(filePath).toLowerCase()),
);

for (const filePath of scannableFiles) {
  const relativePath = path.relative(projectRoot, filePath);
  const contents = await readFile(filePath, "utf8");

  for (const { label, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(contents)) {
      errors.push(`Possible ${label} committed in: ${relativePath}`);
    }
  }

  unfinishedMarkerPattern.lastIndex = 0;
  if (unfinishedMarkerPattern.test(contents)) {
    errors.push(`Unfinished ${unfinishedMarkerLabels.join("/")} marker in: ${relativePath}`);
  }
}

const pdfFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === ".pdf");
for (const pdfPath of pdfFiles) {
  const pdfStats = await stat(pdfPath);
  if (pdfStats.size < 20 * 1024) {
    errors.push(
      `PDF is smaller than 20 KiB: ${path.relative(projectRoot, pdfPath)} (${pdfStats.size} bytes)`,
    );
  }
}

if (errors.length > 0) {
  console.error("Submission verification failed:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Submission verification passed (${requiredFiles.length} required files, ${scannableFiles.length} source/document files, ${pdfFiles.length} PDFs).`,
  );
}
