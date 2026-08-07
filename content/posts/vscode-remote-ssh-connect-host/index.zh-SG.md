---
title: "使用 VS Code Remote SSH 连接远程主机：从插件到远程目录"
description: "在 Windows 上通过 VS Code Remote SSH 连接远程 Linux 主机，设置 SSH Host，并在远程资源管理器中开启远程目录。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "开发效率"
draft: false
cover: ""
---

远程开发的核心不是“把文件传来传去”，而是让本机 VS Code 直接开启远程主机上的目录。VS Code Remote SSH 的价值就在这里：本机 Windows 负责界面和互动，远程主机负责保存文件并提供远程终端。

这篇文章从实际连接远程主机的角度出发，记录 VS Code Remote SSH 的两种常见设置方式：密钥对登录和密码登录。

## 适用场景

这个方案适合以下几类工作：

- 在云主机、NAS、软路由或开发机上直接编辑远程文件；
- 需要用 VS Code 管理远程目录和远程终端；
- 不想频繁通过 SFTP、scp 或文件管理器手动同步文件；
- 希望在多个远程主机之间快速切换。

这篇文章只讨论如何连接远程主机，不展开项目复制、依赖安装或建设流程。

## 准备连接信息

连接前先准备这些信息：

```text
HostName：远程主机公网 IP 或域名
User：远程用户名称，例如 root、ubuntu、debian 或自定义用户
Port：SSH 端口，默认 22，也可以是自定义端口
IdentityFile：本机私钥路径，使用密钥登录时需要
Password：远程用户密码，使用密码登录时需要，不建议写入 config
```

Windows 10/11 通常已经内置 OpenSSH Client。可以在 PowerShell 中检查：

```powershell
ssh -V
```

如果能看到 OpenSSH 版本，表示本机 SSH 客户端可用。

## 方式一：使用密钥对登录

密钥对登录是更推荐的方式。它不需要每次输入服务器密码，也更适合长期使用 VS Code Remote SSH。

### 产生 SSH 密钥

在 PowerShell 中执行：

```powershell
ssh-keygen -t ed25519 -C "vscode-remote"
```

默认会产生：

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

准备好公钥后，后面在 VS Code 的 SSH Host 设置里填入本机私钥路径即可。

## 方式二：使用密码登录

如果只是临时连接一台测试主机，或者还没有来得及设置公钥，也可以直接使用密码登录。此时本机 SSH Host 设置不需要写 `IdentityFile`。如果服务器允许密码登录，VS Code Remote SSH 连接这个 Host 时会跳出密码输入框。

需要注意的是，密码登录依赖远程 SSH 服务端允许 `PasswordAuthentication`。有些 VPS 镜像默认关闭密码登录，只允许密钥登录；如果开启密码登录，建议配合强密码、非默认端口、防火墙或 Fail2ban 一类的登录保护策略。

## 连接步骤

### 1. 安装 Remote - SSH 扩展

安装 VS Code 扩展：

```text
Remote - SSH
```

安装完成后建议重启一次 VS Code，避免左侧远程资源管理器、命令面板和 SSH 设置入口没有立即刷新。

### 2. 设置 SSH Host

开启命令面板：

```text
Ctrl + Shift + P
Remote-SSH: Open SSH Configuration File...
```

选择 Windows 用户目录下的 SSH 设置档：

```text
C:\Users\User\.ssh\config
```

如果使用密钥登录，写入类似设置：

```sshconfig
Host blog-dev
  HostName 你的服务器 IP 或域名
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

如果使用密码登录，可以不写 `IdentityFile`：

```sshconfig
Host blog-dev-password
  HostName 你的服务器 IP 或域名
  User root
  Port 22
  PreferredAuthentications password,keyboard-interactive
```

存储设置后，VS Code 的远程资源管理器中会出现对应的 Host。

### 3. 连接远程主机

连接方式有两种。可以继续使用命令面板：

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

也可以点击左侧活动列的远程资源管理器图示，在 `远程(隧道/SSH)` 视图里展开 `SSH`，选择刚设置的主机并连接。连接成功后，主机旁边会显示已连接状态。

首次连接时，VS Code 会在远程主机安装 VS Code Server。如果使用密码登录，VS Code 会跳出密码输入框；如果使用密钥登录，通常会直接进入远程窗口。

### 4. 开启远程目录

连接成功后，在远程资源管理器中展开主机，选择需要开启的远程目录，例如：

```bash
/opt
```

或：

```bash
/home/deploy
```

开启后，本机 VS Code 窗口实际操作的是远程主机上的目录。后续在资源管理器中编辑文件、开启终端、保存内容，都会发生在远程主机上。

## 小容量 VPS 的限制

VS Code Remote SSH 首次连接时会在远程主机安装 VS Code Server，通常位于：

```bash
~/.vscode-server
```

后续安装远程扩展、开启多个远程窗口或保留旧版本 VS Code Server 时，也会继续占用远程磁盘。对于 edgeproxy 这类只有 5G 左右存储分配的小型 VPS，这个限制会比较明显：`~/.vscode-server` 和远程扩展缓存叠加后，可能把磁盘占满。磁盘满了以后，常见表现包括 VS Code Server 安装失败、远程终端异常、文件保存失败。

连接前建议先检查空间：

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

如果空间紧张，可以优先减少远程扩展数量，或者移除旧的 VS Code Server 版本目录：

```bash
rm -rf ~/.vscode-server/bin/<旧版本目录>
```

如果这台 VPS 主要用于代理、转发或轻量服务，不建议把它当成完整开发机长期使用。Remote SSH 更适合磁盘空间、内存和 CPU 都有一定余量的远程主机。

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

另外确认本机 `IdentityFile` 指向的是私钥，而不是 `.pub` 公钥。

### 3. known_hosts 报错

如果服务器重装过系统或 IP 被重复使用，本机可能出现 host key 冲突。可以先确认确实是你的服务器，再清理旧记录：

```powershell
ssh-keygen -R 服务器 IP 或域名
```

然后重新连接。

## 小结

VS Code Remote SSH 的重点不是“远程桌面”，而是让 VS Code 通过 SSH 直接管理远程主机上的目录。实际使用时，把顺序记住就够了：安装 Remote - SSH 扩展，重启 VS Code，设置 SSH Host，然后从远程资源管理器连接主机并开启目录。

## 参考

- VS Code Remote SSH 文件：<https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace：<https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
