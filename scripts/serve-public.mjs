import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const outputDir = path.join(process.cwd(), "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".m4a", "audio/mp4"],
  [".md", "text/markdown; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".vtt", "text/vtt; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "text/xml; charset=utf-8"]
]);

function normalizeUrl(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  return pathname.replace(/^\/+/, "");
}

function resolvePublicPath(url) {
  const relative = normalizeUrl(url);
  const requestPath = path.normalize(path.join(outputDir, relative));
  if (!requestPath.startsWith(outputDir)) return null;
  return requestPath;
}

async function findFile(url) {
  const requestPath = resolvePublicPath(url);
  if (!requestPath) return null;

  const candidates = [
    requestPath,
    path.join(requestPath, "index.html")
  ];

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {}
  }

  const notFound = path.join(outputDir, "404.html");
  return (await stat(notFound).then((info) => info.isFile()).catch(() => false)) ? notFound : null;
}

createServer(async (request, response) => {
  const file = await findFile(request.url || "/");
  if (!file) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const ext = path.extname(file);
  response.writeHead(file.endsWith("404.html") ? 404 : 200, {
    "Content-Type": mime.get(ext) || "application/octet-stream",
    "Cache-Control": ext === ".xml" ? "no-cache" : "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`Serving dist at http://${host}:${port}/`);
});
