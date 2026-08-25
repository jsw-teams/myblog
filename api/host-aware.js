const ORIGIN_TOKEN = "__MYBLOG_REQUEST_ORIGIN__";

function firstHeader(value) {
  if (Array.isArray(value)) return value[0] || "";
  return String(value || "").split(",")[0].trim();
}

function safePublicOrigin(req) {
  // Prefer the actual Host header. Reverse proxies may rewrite x-forwarded-host
  // to an upstream/origin hostname, while Host is the hostname the visitor used.
  const host = firstHeader(req.headers.host || req.headers["x-forwarded-host"]);
  const forwardedProto = firstHeader(req.headers["x-forwarded-proto"]);
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");

  if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(host)) {
    throw new Error("Invalid Host header");
  }
  if (proto !== "http" && proto !== "https") {
    throw new Error("Invalid forwarded protocol");
  }
  return `${proto}://${host}`;
}

function deploymentOrigin(req) {
  // Fetch immutable build templates from this exact Vercel deployment instead
  // of fetching through the visitor hostname, which may be proxied or rewritten.
  const deploymentHost = String(process.env.VERCEL_URL || "").trim();
  if (/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(deploymentHost)) {
    return `https://${deploymentHost}`;
  }
  return safePublicOrigin(req);
}

function normalizeRequestedPath(value) {
  const raw = Array.isArray(value) ? value.join("/") : String(value || "/");
  let pathname = raw.startsWith("/") ? raw : `/${raw}`;
  pathname = pathname.replace(/\/{2,}/g, "/");
  try {
    pathname = decodeURIComponent(pathname);
  } catch {}
  if (pathname.includes("..")) return null;
  return pathname;
}

function toTemplatePath(pathname) {
  if (pathname === "/") return "/index.html";
  if (/\.[A-Za-z0-9]+$/.test(pathname)) return pathname;
  return `${pathname.replace(/\/$/, "")}/index.html`;
}

async function fetchTemplate(origin, pathname) {
  const templatePath = toTemplatePath(pathname);
  const url = new URL(`/__host_template${templatePath}`, origin);
  return fetch(url, {
    headers: {
      "user-agent": "myblog-host-aware-runtime/2.0",
      "accept": "text/html,application/rss+xml,application/xml,text/xml,text/markdown,text/plain,application/json;q=0.9,*/*;q=0.1"
    },
    redirect: "follow"
  });
}

function cacheHeaders(res, contentType) {
  res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
  res.setHeader("Vercel-CDN-Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  res.setHeader("Vary", "Host");
  res.setHeader("X-Myblog-Host-Aware", "2");
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  let publicOrigin;
  let templateOrigin;
  try {
    publicOrigin = safePublicOrigin(req);
    templateOrigin = deploymentOrigin(req);
  } catch {
    return res.status(400).send("Bad Request");
  }

  const pathname = normalizeRequestedPath(req.query.path);
  if (!pathname) return res.status(400).send("Bad Request");

  let upstream;
  let status = 200;
  try {
    upstream = await fetchTemplate(templateOrigin, pathname);
    if (!upstream.ok) {
      upstream = await fetchTemplate(templateOrigin, "/404.html");
      status = 404;
    }
  } catch (error) {
    console.error("host-aware template fetch failed", error);
    return res.status(502).send("Bad Gateway");
  }

  if (!upstream.ok) {
    return res.status(status === 404 ? 404 : 502).send(status === 404 ? "Not Found" : "Bad Gateway");
  }

  const body = (await upstream.text()).replaceAll(ORIGIN_TOKEN, publicOrigin);
  cacheHeaders(res, upstream.headers.get("content-type"));

  if (req.method === "HEAD") return res.status(status).end();
  return res.status(status).send(body);
}
