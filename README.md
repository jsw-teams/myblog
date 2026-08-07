# blog.js.gripe

[繁體中文](#繁體中文) · [English](#english)

## 繁體中文

這是一個以 Markdown 管理內容的靜態博客。網站使用 Astro 建置，輸出目錄為 `public/`，目前提供繁體中文（`zh-TW`）、新加坡簡體中文（`zh-SG`）與英文（`en`）。

### 本機寫作

文章路徑：

```text
content/posts/<slug>/index.<locale>.md
```

固定頁面路徑：

```text
content/pages/<page>.<locale>.md
```

文章 frontmatter 範例：

```yaml
---
title: "文章標題"
description: "SEO 摘要"
date: "2026-04-27"
updated: "2026-04-27"
translationKey: "welcome"
tags: ["網站公告"]
category: "公告"
draft: false
cover: ""
---
```

每篇文章必須同時提供 `index.zh-TW.md` 與 `index.zh-SG.md`；需要英文版本時，再加入 `index.en.md`。`draft: true` 的文章不會出現在公開頁面、sitemap、feed 或 llms 檔案中。

### 建置與檢查

需要 Node.js 20 或更新版本：

```bash
npm ci
npm run build
npm run check
```

建置結果位於 `public/`。

若 PowerShell 執行原則阻擋 `npm.ps1`：

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run check
```

### 本機預覽

```bash
npm run serve
```

預覽伺服器只提供靜態檔案，不使用 SPA fallback。

### 部署到 Cloudflare Pages

透過 Cloudflare Pages 的 Git 整合連接本倉庫，並使用以下設定：

| 設定 | 值 |
| --- | --- |
| Production branch | `main` |
| Root directory | `/`（留空亦可） |
| Build command | `npm run build` |
| Build output directory | `public` |
| Node.js | 20 或更新版本 |

倉庫內的 `wrangler.toml` 已將 `pages_build_output_dir` 設為 `./public`。Cloudflare Pages 會以這個檔案作為部署設定來源，因此不會再使用 Astro 常見的預設 `dist/`。日誌出現「No functions dir」是正常訊息，因為本站是純靜態網站。

如果既有 Pages 專案曾把輸出目錄設為 `dist`，重新部署最新提交即可讓 Pages 讀取 `wrangler.toml`；控制台中的建置命令仍須為 `npm run build`。

### 部署到 GitHub Pages

推送到 `main` 後，`.github/workflows/pages.yml` 會執行 `npm ci`、`npm run build` 與 `npm run check`，再發布 `public/`。自訂網域由 `static/CNAME` 寫入建置結果。

## English

This is a static Markdown-based blog built with Astro. The generated site is written to `public/` and supports Traditional Chinese (`zh-TW`), Singapore Simplified Chinese (`zh-SG`), and English (`en`).

### Writing locally

Post path:

```text
content/posts/<slug>/index.<locale>.md
```

Standalone page path:

```text
content/pages/<page>.<locale>.md
```

Example post frontmatter:

```yaml
---
title: "Post title"
description: "SEO summary"
date: "2026-04-27"
updated: "2026-04-27"
translationKey: "welcome"
tags: ["Site announcement"]
category: "Announcement"
draft: false
cover: ""
---
```

Every post must include both `index.zh-TW.md` and `index.zh-SG.md`. Add `index.en.md` when an English version is available. Posts with `draft: true` are excluded from public pages, sitemaps, feeds, and llms files.

### Build and check

Node.js 20 or newer is required:

```bash
npm ci
npm run build
npm run check
```

The generated site is written to `public/`.

If the PowerShell execution policy blocks `npm.ps1`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run check
```

### Local preview

```bash
npm run serve
```

The preview server serves static files without an SPA fallback.

### Deploy to Cloudflare Pages

Connect this repository through Cloudflare Pages Git integration and use these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `/` (or leave empty) |
| Build command | `npm run build` |
| Build output directory | `public` |
| Node.js | 20 or newer |

The repository's `wrangler.toml` sets `pages_build_output_dir` to `./public`. Cloudflare Pages treats this file as the deployment configuration source, so it no longer looks for Astro's common default `dist/` directory. A “No functions dir” log entry is expected because this site is fully static.

If an existing Pages project was configured to publish `dist`, redeploy the latest commit so Pages can load `wrangler.toml`. Keep the dashboard build command set to `npm run build`.

### Deploy to GitHub Pages

After a push to `main`, `.github/workflows/pages.yml` runs `npm ci`, `npm run build`, and `npm run check`, then publishes `public/`. The custom domain is copied from `static/CNAME` into the build output.
