import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "public");
const templateDir = path.join(outputDir, "__host_template");
const siteConfig = JSON.parse(
  await fs.readFile(path.join(rootDir, "content", "site.config.json"), "utf8")
);

if (!siteConfig.siteUrl) {
  throw new Error("content/site.config.json must define siteUrl");
}

const defaultOrigin = new URL(siteConfig.siteUrl).origin;
const originToken = "__MYBLOG_REQUEST_ORIGIN__";

await fs.rm(templateDir, { recursive: true, force: true });

const files = await fg(["**/*.html", "**/*.xml", "**/*.txt"], {
  cwd: outputDir,
  onlyFiles: true,
  dot: true,
  ignore: ["__host_template/**"]
});

let templated = 0;
let replacements = 0;

for (const relativePath of files) {
  const sourcePath = path.join(outputDir, relativePath);
  const targetPath = path.join(templateDir, relativePath);
  const original = await fs.readFile(sourcePath, "utf8");
  const occurrences = original.split(defaultOrigin).length - 1;
  const rewritten = occurrences
    ? original.replaceAll(defaultOrigin, originToken)
    : original;

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, rewritten, "utf8");
  templated += 1;
  replacements += occurrences;
}

await fs.writeFile(
  path.join(templateDir, "manifest.json"),
  `${JSON.stringify({ defaultOrigin, originToken, files: templated, replacements }, null, 2)}\n`,
  "utf8"
);

console.log(
  `[postbuild] host-aware templates: ${templated} files, ${replacements} absolute-origin references replaced`
);
