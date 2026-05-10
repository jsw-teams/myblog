---
title: "使用 VS Code Remote SSH 连接远程主机：从密钥到工作区"
description: "在 Windows 上通过 VS Code Remote SSH 连接远程 Linux 主机，把远程目录当成本地项目一样编辑、运行和排障。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "开发效率"
draft: false
cover: ""
---

远程开发的核心不是“把文件传来传去”，而是让编辑器、终端、Git、依赖安装、构建命令和日志排障尽量靠近真实运行环境。VS Code Remote SSH 的价值就在这里：本地 Windows 只负责交互，远程主机负责保存代码、运行命令和承载开发环境。

这篇文章记录一套可复用的 Windows + VS Code + SSH 远程开发流程。

## 适用场景

这个方案适合以下几类工作：

- 博客、文档站、静态站点的远程写作与构建；
- Node.js、Astro、Vite、Next.js 等项目的服务器侧调试；
- 在云主机、NAS、软路由或开发机上维护长期运行的项目；
- 希望减少“本地能跑，服务器不能跑”这类环境偏差。

如果项目最终部署在 Linux 或 Cloudflare Pages，远程开发能让依赖、换行符、脚本执行权限和构建命令更接近线上环境。

## 准备连接信息

连接前先准备四个信息：

```text
HostName：远程主机公网 IP 或域名
User：远程用户名，例如 root、ubuntu、debian 或自定义用户
Port：SSH 端口，默认 22，也可以是自定义端口
IdentityFile：本地私钥路径
```

Windows 10/11 通常已经内置 OpenSSH Client。可以在 PowerShell 中检查：

```powershell
ssh -V
```

如果能看到 OpenSSH 版本，说明本地 SSH 客户端可用。

## 生成 SSH 密钥

在 PowerShell 中执行：

```powershell
ssh-keygen -t ed25519 -C "vscode-remote"
```

默认会生成：

```text
C:\Users\User\.ssh\id_ed25519
C:\Users\User\.ssh\id_ed25519.pub
```

其中：

- `id_ed25519` 是私钥，只保存在本机；
- `id_ed25519.pub` 是公钥，可以放到远程主机的 `authorized_keys`。

复制公钥内容：

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

然后把这段内容追加到远程主机的：

```bash
~/.ssh/authorized_keys
```

远程主机上的权限建议设置为：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 配置 Windows SSH Host

编辑本地文件：

```text
C:\Users\User\.ssh\config
```

添加一个主机别名：

```sshconfig
Host blog-dev
  HostName 你的服务器IP或域名
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

保存后，在 PowerShell 中测试：

```powershell
ssh blog-dev
```

如果能进入远程 Shell，说明 SSH 配置已经可用。

## 在 VS Code 中连接

安装 VS Code 扩展：

```text
Remote - SSH
```

然后执行：

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

首次连接时，VS Code 会在远程主机安装 VS Code Server。连接成功后，选择远程目录，例如：

```bash
/root/projects/blog.js.gripe
```

或：

```bash
/home/deploy/projects/blog.js.gripe
```

这样，本地 VS Code 打开的就是远程目录，而不是本地副本。

## 克隆或进入博客项目

如果远程主机上还没有项目，可以在 VS Code 的远程终端执行：

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/jsw-teams/myblog.git blog.js.gripe
cd blog.js.gripe
```

如果已经存在项目，直接进入：

```bash
cd ~/projects/blog.js.gripe
git status
```

建议先确认远端地址：

```bash
git remote -v
```

如果需要切回正确远端：

```bash
git remote set-url origin https://github.com/jsw-teams/myblog.git
```

## 远程安装依赖并构建

在远程终端执行：

```bash
npm install
npm run build
npm run check
```

这样做的好处是构建环境和远程部署环境更一致。对于博客类项目，建议每次新增文章后至少执行一次 `npm run build`，再执行 `npm run check`。

## 推荐工作流

我通常会把远程开发流程拆成五步：

```text
连接远程主机
打开远程项目目录
新增或修改 Markdown 内容
执行 build/check
git commit && git push
```

对应命令可以是：

```bash
git status
npm run build
npm run check
git add content/posts
git commit -m "docs: add remote development articles"
git push origin main
```

如果主分支有保护规则，则使用分支：

```bash
git checkout -b docs/remote-dev-posts
git push -u origin docs/remote-dev-posts
```

然后在 GitHub 上创建 Pull Request。

## 常见问题

### 1. 第一次连接很慢

首次连接时，VS Code 会在远程主机安装服务端组件。只要网络稳定，等待安装完成即可。后续连接通常会明显更快。

### 2. 密钥明明正确但仍然要求密码

优先检查三处：

```bash
ls -ld ~/.ssh
ls -l ~/.ssh/authorized_keys
```

权限建议：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

另外确认本地 `IdentityFile` 指向的是私钥，而不是 `.pub` 公钥。

### 3. known_hosts 报错

如果服务器重装过系统或 IP 被复用，本地可能出现 host key 冲突。可以先确认确实是你的服务器，再清理旧记录：

```powershell
ssh-keygen -R 服务器IP或域名
```

然后重新连接。

### 4. 远程终端找不到 node 或 npm

说明远程主机没有安装 Node.js，或 PATH 没配置好。建议用 nvm 管理 Node.js 版本：

```bash
node -v
npm -v
```

如果命令不存在，需要先安装 Node.js，再重新打开 VS Code 远程窗口。

## 小结

VS Code Remote SSH 的重点不是“远程桌面”，而是把开发上下文放到远程主机里：代码、终端、Git、依赖和构建命令都在同一个环境中运行。对于 `blog.js.gripe` 这种静态博客项目，它能让文章写作、构建检查、提交推送和部署验证形成稳定闭环。

## 参考

- VS Code Remote SSH 文档：<https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace：<https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
