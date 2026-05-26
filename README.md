# blog.js.gripe

静态博客写作站点，内容来自 `content/` 下的 Markdown 文件，构建输出到 `public/`。

## 本地写作

文章路径：

```text
content/posts/<slug>/index.<locale>.md
```

页面路径：

```text
content/pages/about.<locale>.md
```

文章 frontmatter 示例：

```yaml
---
title: "文章标题"
description: "SEO 摘要"
date: "2026-04-27"
updated: "2026-04-27"
translationKey: "welcome"
tags: ["站点公告"]
category: "公告"
draft: false
cover: ""
---
```

支持 `zh-CN`、`zh-TW`、`en`，结构上预留 `ja`。`draft: true` 的文章不会进入公开页面、sitemap、feed 或 llms 文件。

## 构建

```bash
npm install
npm run build
npm run check
```

如果 PowerShell 执行策略阻止 `npm.ps1`：

```powershell
npm.cmd install
npm.cmd run build
npm.cmd run check
```

## 本地预览

```bash
npm run serve
```

预览服务只按静态文件返回内容，不启用 SPA fallback。

## 部署到 Cloudflare Pages

构建输出目录为 `public/`。可以直接上传 `public/`，也可以使用 Wrangler：

```bash
npm run deploy
```

`npm run deploy` 会先执行 `build` 和 `check`，然后把 `public/` 部署到 Cloudflare Pages 的 `main` 分支。当前 Pages 项目的生产分支也是 `main`。

也可以显式执行同一个生产部署命令：

```bash
npm run deploy:production
```

Cloudflare Pages 的输出目录请设置为 `public`。

如果使用 Cloudflare Pages 连接 GitHub 仓库自动部署，项目设置请填：

```text
Framework preset: Astro
Build command: npm run pages:build
Build output directory: public
Root directory: /
```

不要把 Build command 设置成 `npm install`。Cloudflare Pages 会先自动安装依赖；Build command 必须生成 `public/`，否则会报 `Error: Output directory "public" not found.`。
