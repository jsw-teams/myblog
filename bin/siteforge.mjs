#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [command, targetArg] = process.argv.slice(2);

const copiedEntries = [
  "AGENTS.md",
  "LICENSE",
  "NOTICE",
  "README.md",
  "README.en.md",
  "astro.config.mjs",
  "config.yml",
  "content",
  "package-lock.json",
  "pnpm-lock.yaml",
  "scripts",
  "src",
  "static",
  "themes"
];

const gitignore = `node_modules/
public/
dist/
.astro/
.cache/
static/assets/
static/apple-touch-icon.png
static/favicon-32x32.png
static/favicon.ico
static/site.webmanifest
.npm-cache/
.wrangler/
.env
.env.*
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
serve.log
serve.err.log
siteforge-preview.log
siteforge-preview.err.log
`;

function help() {
  console.log(`Usage:
  siteforge init <directory>
  siteforge generate
  siteforge server
  siteforge check

Create a Siteforge starter site in <directory>.
Generate, preview, or check an existing Siteforge site from its project root.
`);
}

function packageNameFromTarget(target) {
  return path.basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "") || "siteforge-site";
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function assertEmptyOrMissing(target) {
  if (!(await pathExists(target))) return;
  const entries = await fs.readdir(target);
  if (entries.length) {
    throw new Error(`Target directory is not empty: ${target}`);
  }
}

async function copyEntry(entry, targetRoot) {
  const source = path.join(packageRoot, entry);
  if (!(await pathExists(source))) return;
  await fs.cp(source, path.join(targetRoot, entry), {
    recursive: true,
    errorOnExist: false,
    force: true,
    filter: (src) => {
      const name = path.basename(src);
      return !["node_modules", "dist", ".astro", ".cache", ".git"].includes(name);
    }
  });
}

async function writeStarterPackage(targetRoot) {
  const packagePath = path.join(targetRoot, "package.json");
  const data = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
  const sourcePackageName = data.name;
  const sourcePackageVersion = data.version;
  data.name = packageNameFromTarget(targetRoot);
  data.version = "0.1.0";
  data.private = true;
  data.description = "A Siteforge site.";
  data.scripts = {
    generate: "siteforge generate",
    build: "siteforge generate",
    server: "siteforge server",
    serve: "siteforge server",
    check: "siteforge check"
  };
  data.devDependencies = {
    ...(data.devDependencies || {}),
    [sourcePackageName]: `^${sourcePackageVersion}`
  };
  delete data.bin;
  delete data.files;
  delete data.publishConfig;
  delete data.repository;
  delete data.bugs;
  delete data.homepage;
  delete data.keywords;
  await fs.writeFile(packagePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function init() {
  if (!targetArg || targetArg === "-h" || targetArg === "--help") {
    help();
    process.exit(targetArg ? 0 : 1);
  }
  const targetRoot = path.resolve(process.cwd(), targetArg);
  await assertEmptyOrMissing(targetRoot);
  await fs.mkdir(targetRoot, { recursive: true });
  for (const entry of copiedEntries) await copyEntry(entry, targetRoot);
  await writeStarterPackage(targetRoot);
  await fs.writeFile(path.join(targetRoot, ".gitignore"), gitignore);
  console.log(`Created Siteforge site in ${targetRoot}`);
  console.log("");
  console.log("Next steps:");
  console.log(`  cd ${path.relative(process.cwd(), targetRoot) || "."}`);
  console.log("  npm install");
  console.log("  npx siteforge server");
}

function run(commandName, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${commandName} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function assertProjectFile(file) {
  if (!(await pathExists(path.join(process.cwd(), file)))) {
    throw new Error(`Run this command from a Siteforge project root; missing ${file}.`);
  }
}

async function generate() {
  await assertProjectFile("src/prebuild.mjs");
  await assertProjectFile("node_modules/astro/bin/astro.mjs");
  await run(process.execPath, [path.join(process.cwd(), "src/prebuild.mjs")]);
  await run(process.execPath, [path.join(process.cwd(), "node_modules/astro/bin/astro.mjs"), "build"]);
}

async function server() {
  await assertProjectFile("scripts/serve-public.mjs");
  await run(process.execPath, [path.join(process.cwd(), "scripts/serve-public.mjs")]);
}

async function check() {
  await assertProjectFile("scripts/check-build.mjs");
  await run(process.execPath, [path.join(process.cwd(), "scripts/check-build.mjs")]);
}

if (!command || command === "-h" || command === "--help") {
  help();
  process.exit(0);
}

const commands = {
  init,
  generate,
  build: generate,
  server,
  serve: server,
  check
};

if (!commands[command]) {
  console.error(`Unknown command: ${command}`);
  help();
  process.exit(1);
}

commands[command]().catch((error) => {
  console.error(`siteforge: ${error.message}`);
  process.exit(1);
});
