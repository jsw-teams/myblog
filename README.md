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

## 部署到 GitHub Pages

推送到 `main` 后，GitHub Actions 会运行 `.github/workflows/pages.yml`，执行 `npm ci`、`npm run build` 和 `npm run check`，然后把 `public/` 发布到 GitHub Pages。

GitHub Pages 的自定义域名为 `blog.js.gripe`，由 `static/CNAME` 写入构建输出。
