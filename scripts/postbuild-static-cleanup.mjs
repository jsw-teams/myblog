import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

const rootDir = process.cwd();
const outputDir = path.join(rootDir, "public");
const replacements = [
  ["https://blog.js.gripe", "https://blog.openjsu.com"],
  ["http://blog.js.gripe", "https://blog.openjsu.com"],
  ["Blog.js.gripe", "Blog.openjsu.com"],
  ["blog.js.gripe", "blog.openjsu.com"]
];
const privacyLinkPattern = /<a href="([^"]*?)about(\/?)"([^>]*)>(隱私政策|隐私政策|Privacy(?: Policy)?)<\/a>/g;

const files = await fg([
  "**/*.html",
  "**/*.xml",
  "**/*.txt",
  "**/*.md",
  "**/*.json"
], {
  cwd: outputDir,
  onlyFiles: true,
  dot: true,
  ignore: ["assets/**"]
});

let changedFiles = 0;
let replacementCount = 0;
let privacyLinksFixed = 0;

for (const relativePath of files) {
  const filePath = path.join(outputDir, relativePath);
  const original = await fs.readFile(filePath, "utf8");
  let rewritten = original;

  for (const [from, to] of replacements) {
    const count = rewritten.split(from).length - 1;
    if (count > 0) {
      rewritten = rewritten.replaceAll(from, to);
      replacementCount += count;
    }
  }

  rewritten = rewritten.replace(privacyLinkPattern, (match, prefix, slash, attrs, label) => {
    privacyLinksFixed += 1;
    return `<a href="${prefix}privacy${slash}"${attrs}>${label}</a>`;
  });

  if (rewritten !== original) {
    await fs.writeFile(filePath, rewritten, "utf8");
    changedFiles += 1;
  }
}

const leftovers = [];
for (const relativePath of files) {
  const filePath = path.join(outputDir, relativePath);
  const text = await fs.readFile(filePath, "utf8");
  if (/blog\.js\.gripe/i.test(text)) leftovers.push(relativePath);
}

if (leftovers.length) {
  throw new Error(`Legacy domain still present in generated output: ${leftovers.join(", ")}`);
}

console.log(`[postbuild] static cleanup: ${changedFiles} files updated, ${replacementCount} legacy-domain references replaced, ${privacyLinksFixed} privacy footer links fixed`);
