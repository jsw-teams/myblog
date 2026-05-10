---
title: "把 VS Code 远程开发与 Codex 结合：让远程主机成为高效开发工作台"
description: "通过 VS Code Remote SSH、Codex IDE 扩展和 Codex CLI，把远程主机上的真实项目环境变成可协作、可构建、可审查的开发工作台。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "vscode-remote-codex-dev-efficiency"
tags: ["VS Code", "Remote SSH", "Codex"]
category: "开发效率"
draft: false
cover: ""
---

单独使用 VS Code Remote SSH，可以把项目放在远程主机上开发；单独使用 Codex，可以让 AI 帮助理解代码、修改文件、运行命令和生成方案。把两者结合起来，远程主机就不只是“服务器”，而是一个带有 AI 协作能力的开发工作台。

这篇文章记录一种适合 `blog.js.gripe` 这类静态博客项目，也适合 API、网关、控制台和自动化脚本项目的开发模式。

## 总体架构

推荐的工作流如下：

```text
Windows 本地 VS Code
        ↓ Remote SSH
远程 Linux 项目目录
        ↓
Codex IDE 扩展 / Codex CLI
        ↓
Git 分支、构建检查、提交推送
```

本地只保留编辑器 UI 和认证入口，真正的代码、依赖、构建命令和 Git 状态都在远程主机上。

这种结构有三个优势：

1. 远程环境更接近部署环境；
2. Codex 获取的是当前项目的真实上下文；
3. 构建和检查命令可以直接在远程终端执行，减少环境差异。

## 方式一：使用 Codex IDE 扩展

在 VS Code 中安装 Codex IDE 扩展后，可以在侧边栏中打开 Codex。对于远程窗口，建议先确认你当前打开的是远程工作区，而不是本地目录：

```text
左下角应显示 SSH: blog-dev
资源管理器打开的是远程路径，例如 /home/deploy/projects/blog.js.gripe
```

然后可以让 Codex 基于当前工作区执行任务，例如：

```text
请阅读 content/posts 的现有文章结构，按照当前 frontmatter 规范新增一篇关于 Remote SSH 的中文文章，并保持 translationKey 命名一致。
```

这类任务适合：

- 新增博客文章；
- 生成 frontmatter；
- 检查 Markdown 链接；
- 解释项目结构；
- 修改小范围代码；
- 生成提交说明。

## 方式二：在远程终端使用 Codex CLI

如果更偏好命令行工作流，可以在远程主机中安装 Codex CLI：

```bash
npm i -g @openai/codex
```

进入项目目录后运行：

```bash
cd ~/projects/blog.js.gripe
codex
```

首次运行时需要登录或配置 API Key。CLI 模式的优势是和远程 Shell 更贴近，适合直接围绕 Git、构建命令、脚本和文件修改进行协作。

常见用法：

```text
请检查这个 Astro 静态博客的 content/posts 结构，告诉我新增三语言文章时应该使用哪些文件名。
```

或：

```text
请根据 README 的规范，为新增文章生成 zh-CN、zh-TW、en 三个版本，并在完成后运行 npm run build 和 npm run check。
```

## 为 Codex 提供清晰边界

和 AI 协作时，最重要的是边界清晰。建议每次任务都说明四件事：

```text
目标：要完成什么
范围：允许改哪些目录或文件
验证：完成后需要运行哪些命令
限制：不要改哪些内容
```

例如：

```text
目标：新增一篇关于 GitHub Webhook 触发 Cloudflare Pages 重部署的文章。
范围：只允许修改 content/posts/github-webhook-blog-redeploy 下的 Markdown 文件。
验证：完成后运行 npm run build 和 npm run check。
限制：不要修改 package.json、astro.config.mjs、src 目录和 wrangler.toml。
```

这样可以降低误改核心配置的风险。

## 建议的目录策略

对于多语言文章，建议使用同一个 slug 目录，不同语言用不同文件：

```text
content/posts/vscode-remote-codex-dev-efficiency/index.zh-CN.md
content/posts/vscode-remote-codex-dev-efficiency/index.zh-TW.md
content/posts/vscode-remote-codex-dev-efficiency/index.en.md
```

三份文件使用相同的 `translationKey`：

```yaml
translationKey: "vscode-remote-codex-dev-efficiency"
```

这样后续做语言切换、站内索引、RSS、sitemap 或 llms 文件时，更容易把不同语言识别为同一篇文章的不同版本。

## 远程构建检查

文章或代码修改完成后，在远程终端执行：

```bash
npm run build
npm run check
```

如果 PowerShell 本地执行策略影响 `npm.ps1`，远程 Linux 终端通常不会遇到这个问题。但如果你是在 Windows 本地项目中执行，可以使用：

```powershell
npm.cmd run build
npm.cmd run check
```

对于博客项目，建议把构建检查作为每次提交前的固定动作，而不是部署失败后再排查。

## Git 工作流

如果直接推送主分支：

```bash
git status
git add content/posts
git commit -m "docs: add Codex remote development article"
git push origin main
```

如果使用分支：

```bash
git checkout -b docs/codex-remote-dev
git add content/posts
git commit -m "docs: add Codex remote development article"
git push -u origin docs/codex-remote-dev
```

分支模式更适合让 Codex 参与较大范围修改，因为可以先通过 Pull Request 查看 diff，再合并到主分支。

## 适合交给 Codex 的任务

Codex 更适合做结构清楚、验证路径明确的任务，例如：

- 根据已有模板新增文章；
- 把简体中文转换为繁体中文和英文版本；
- 检查 Markdown frontmatter 字段；
- 总结最近一次 diff；
- 为提交生成 commit message；
- 排查构建错误；
- 补充 README 或部署说明；
- 对小范围脚本做重构。

不建议一开始就让 Codex 改动过大的范围，例如同时修改构建系统、部署脚本、站点主题和文章内容。大任务应该拆成多个小任务，每个任务都能独立验证。

## 一个可复用提示词

下面这个提示词适合远程项目中新增多语言博客文章：

```text
你正在 /home/deploy/projects/blog.js.gripe 工作区。
请读取 README.md 和 content/posts 的现有结构。
目标：新增一篇关于 {主题} 的文章。
要求：
1. 路径为 content/posts/{slug}/index.zh-CN.md、index.zh-TW.md、index.en.md；
2. 三个语言版本使用相同 translationKey；
3. frontmatter 必须包含 title、description、date、updated、translationKey、tags、category、draft、cover；
4. draft 设置为 false；
5. 完成后运行 npm run build 和 npm run check；
6. 不要修改 src、package.json、wrangler.toml。
```

这个提示词把任务范围、文件结构、frontmatter、验证命令和禁止修改项都写清楚了，更适合让 Codex 执行。

## 安全注意事项

远程主机一旦和 AI 工具、Git 仓库、部署脚本绑定，就要更注意权限：

- 不要把 `.env`、API Key、Cloudflare Token、Webhook Secret 写进文章或提交到仓库；
- 如果需要让 Codex 读取配置，优先给示例文件，例如 `.env.example`；
- 对能执行命令的模式保持审慎，先看计划，再授权执行；
- 大范围改动使用 Git 分支和 Pull Request；
- 对部署钩子、私钥、Token 一律视为敏感信息。

## 小结

VS Code Remote SSH 解决的是“在哪里开发”的问题，Codex 解决的是“如何更快理解、修改和验证项目”的问题。两者结合后，远程主机就能变成一个稳定、可复现、可协作的开发工作台。

对于 `blog.js.gripe`，可以把这个工作流固定为：远程打开项目、让 Codex 生成或审查内容、运行构建检查、通过 Git 合并和部署。这样既能提升写作和开发效率，也能控制误改和部署风险。

## 参考

- Codex IDE 扩展文档：<https://developers.openai.com/codex/ide>
- Codex CLI 文档：<https://developers.openai.com/codex/cli>
- VS Code Remote SSH 文档：<https://code.visualstudio.com/docs/remote/ssh>
