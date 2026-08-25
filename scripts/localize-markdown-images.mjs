import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import fg from "fast-glob";

const rootDir = process.cwd();
const staticDir = path.join(rootDir, "static");
const remoteDir = path.join(staticDir, "assets", "remote");
const markdownGlobs = ["content/**/*.md", "static/**/*.md"];
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"]);
const typeExtensions = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/avif", ".avif"],
  ["image/svg+xml", ".svg"]
]);

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function publicPath(filePath) {
  return `/${path.relative(staticDir, filePath).split(path.sep).map(encodeURIComponent).join("/")}`;
}

function safeBaseName(value) {
  return value
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "image";
}

async function buildLocalImageIndex() {
  const files = await fg("assets/**/*.{png,jpg,jpeg,webp,gif,avif,svg}", {
    cwd: staticDir,
    onlyFiles: true,
    caseSensitiveMatch: false
  });
  const byBaseName = new Map();
  for (const relativePath of files) {
    const base = path.basename(relativePath).toLowerCase();
    if (!byBaseName.has(base)) byBaseName.set(base, []);
    byBaseName.get(base).push(path.join(staticDir, relativePath));
  }
  return byBaseName;
}

async function asyncReplace(input, regex, replacer) {
  const matches = [...input.matchAll(regex)];
  if (!matches.length) return input;
  let result = "";
  let cursor = 0;
  for (const match of matches) {
    result += input.slice(cursor, match.index);
    result += await replacer(match);
    cursor = match.index + match[0].length;
  }
  return result + input.slice(cursor);
}

function normalizedRemoteExtension(url, contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  if (typeExtensions.has(type)) return typeExtensions.get(type);
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  return imageExtensions.has(ext) ? ext : ".img";
}

export async function localizeMarkdownImages() {
  await fs.mkdir(remoteDir, { recursive: true });
  const localIndex = await buildLocalImageIndex();
  const markdownFiles = await fg(markdownGlobs, {
    cwd: rootDir,
    onlyFiles: true,
    ignore: ["public/**", "node_modules/**"]
  });

  const resolved = new Map();
  const downloaded = new Map();
  let changedFiles = 0;
  let localizedReferences = 0;

  async function localizeUrl(rawUrl) {
    if (resolved.has(rawUrl)) return resolved.get(rawUrl);

    const parsed = new URL(rawUrl);
    const decodedPath = decodeURIComponent(parsed.pathname);

    if (decodedPath.startsWith("/assets/")) {
      const candidate = path.join(staticDir, decodedPath.replace(/^\/+/, ""));
      if (await exists(candidate)) {
        const result = publicPath(candidate);
        resolved.set(rawUrl, result);
        return result;
      }
    }

    const base = path.basename(decodedPath).toLowerCase();
    const matches = localIndex.get(base) || [];
    if (matches.length === 1) {
      const result = publicPath(matches[0]);
      resolved.set(rawUrl, result);
      return result;
    }

    const hash = crypto.createHash("sha256").update(rawUrl).digest("hex").slice(0, 16);
    let response;
    try {
      response = await fetch(rawUrl, {
        redirect: "follow",
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; myblog-media-localizer/1.0; +https://github.com/jsw-teams/myblog)",
          "accept": "image/avif,image/webp,image/png,image/jpeg,image/gif,image/svg+xml,image/*;q=0.8,*/*;q=0.1"
        },
        signal: AbortSignal.timeout(30000)
      });
    } catch (error) {
      throw new Error(`Unable to download Markdown image ${rawUrl}: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`Unable to download Markdown image ${rawUrl}: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      throw new Error(`External Markdown image did not return an image: ${rawUrl} (${contentType})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error(`External Markdown image is empty: ${rawUrl}`);
    if (buffer.length > 20 * 1024 * 1024) throw new Error(`External Markdown image exceeds 20 MiB: ${rawUrl}`);

    const ext = normalizedRemoteExtension(rawUrl, contentType);
    const sourceBase = safeBaseName(path.basename(decodedPath, path.extname(decodedPath)) || "image");
    const filename = `${sourceBase}-${hash}${ext}`;
    const target = path.join(remoteDir, filename);
    if (!(await exists(target))) await fs.writeFile(target, buffer);

    const result = publicPath(target);
    localIndex.set(filename.toLowerCase(), [target]);
    downloaded.set(rawUrl, result);
    resolved.set(rawUrl, result);
    return result;
  }

  for (const relativePath of markdownFiles) {
    const filePath = path.join(rootDir, relativePath);
    const original = await fs.readFile(filePath, "utf8");
    let text = original;

    text = await asyncReplace(
      text,
      /^(\s*cover\s*:\s*)(["']?)(https?:\/\/[^\s"']+)\2\s*$/gim,
      async (match) => {
        const localized = await localizeUrl(match[3]);
        localizedReferences += 1;
        return `${match[1]}"${localized}"`;
      }
    );

    text = await asyncReplace(
      text,
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\)/g,
      async (match) => {
        const localized = await localizeUrl(match[2]);
        localizedReferences += 1;
        return `![${match[1]}](${localized}${match[3] || ""})`;
      }
    );

    text = await asyncReplace(
      text,
      /<img\b([^>]*?)\bsrc=(["'])(https?:\/\/[^"']+)\2([^>]*)>/gi,
      async (match) => {
        const localized = await localizeUrl(match[3]);
        localizedReferences += 1;
        return `<img${match[1]}src=${match[2]}${localized}${match[2]}${match[4]}>`;
      }
    );

    const unresolved = [];
    if (/^\s*cover\s*:\s*["']?https?:\/\//im.test(text)) unresolved.push("frontmatter cover");
    if (/!\[[^\]]*\]\(https?:\/\//i.test(text)) unresolved.push("Markdown image");
    if (/<img\b[^>]*\bsrc=["']https?:\/\//i.test(text)) unresolved.push("HTML image");
    if (unresolved.length) {
      throw new Error(`${relativePath} still contains external embedded images: ${unresolved.join(", ")}`);
    }

    if (text !== original) {
      await fs.writeFile(filePath, text, "utf8");
      changedFiles += 1;
    }
  }

  console.log(
    `[prebuild] Markdown image audit: ${markdownFiles.length} files checked, ${changedFiles} files rewritten, ${localizedReferences} image references localized, ${downloaded.size} remote images downloaded into /assets/remote/.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  localizeMarkdownImages().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
