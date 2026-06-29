---
title: "VS Code Remote SSH 连接后安装 Codex：为什么远程窗口需要重新安装和认证"
description: "通过 VS Code Remote SSH 连接远程主机后，Codex 需要在远程窗口中重新安装并重新认证，否则侧边栏图标和功能可能不会像本地窗口那样显示。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-codex-dev-efficiency"
tags: ["VS Code", "Remote SSH", "Codex"]
category: "开发效率"
draft: false
cover: ""
---

使用 VS Code Remote SSH 连接远程主机后，经常会遇到一个容易误解的现象：本地 VS Code 明明已经安装了 Codex 扩展，切到远程 SSH 窗口后，Codex 图标却没有像本地窗口那样出现在侧边栏。

原因很简单：Remote SSH 打开的不是普通本地窗口，而是一个连接到远程主机的远程窗口。VS Code 会在远程主机上运行一套远程扩展环境。本地安装过的扩展和本地登录状态，不一定会自动带到远程主机里。对 Codex 来说，远程窗口通常需要重新安装一次扩展，并重新完成一次认证。

下面用一个泛化主机名 `remote-dev` 举例，避免把真实服务器名称写进教程。

## 前提

继续之前，先确认你已经完成了 VS Code Remote SSH 连接：

```text
左侧远程资源管理器中能看到 SSH 主机 remote-dev
主机状态显示已连接
当前窗口左下角显示 SSH: remote-dev
远程终端提示符来自远程主机
```

如果当前打开的还是本地 Windows 目录，例如 `C:\Users\User\Desktop`，那还不是远程工作区。需要先从远程资源管理器中连接主机，并打开远程目录，例如：

```bash
/opt
```

或：

```bash
/home/deploy
```

## 为什么本地装过 Codex 还要远程再装

VS Code Remote SSH 连接后，扩展大致分成两类：

- 本地 UI 侧扩展：运行在本地 VS Code 客户端中；
- 远程工作区扩展：运行在远程主机的 VS Code Server 环境中。

Codex 需要读取当前工作区、显示侧边栏入口，并和远程目录中的文件交互。远程 SSH 窗口里的工作区在远程主机上，所以只在本地装过 Codex 并不够。你需要在远程窗口里安装 Codex，安装位置通常会显示为类似：

```text
Install in SSH: remote-dev
```

安装完成后，Codex 图标才会在这个远程窗口里正常出现。

## 安装步骤

### 1. 先连接 Remote SSH

打开 VS Code 左侧远程资源管理器，选择 `远程(隧道/SSH)`，在 `SSH` 下连接示例主机：

```text
remote-dev
```

连接成功后，打开一个远程目录，例如 `/opt`。这一步很重要，因为 Codex 要安装到当前远程窗口，而不是普通本地窗口。

### 2. 在远程窗口安装 Codex 扩展

打开扩展面板：

```text
Ctrl + Shift + X
```

搜索：

```text
Codex
```

如果扩展已经在本地安装过，但远程窗口还不能使用，扩展页面通常会出现远程安装入口。选择类似下面的按钮：

```text
Install in SSH: remote-dev
```

不要只看本地是否已经安装。关键是确认当前远程 SSH 窗口也安装了 Codex。

### 3. 重载或重启 VS Code 窗口

安装完成后，如果侧边栏没有立即出现 Codex 图标，可以执行：

```text
Ctrl + Shift + P
Developer: Reload Window
```

也可以直接关闭当前远程窗口，再重新通过 Remote SSH 连接 `remote-dev`。很多时候，重载窗口后 Codex 图标才会稳定显示。

### 4. 重新认证 Codex

远程窗口里的 Codex 需要单独认证。即使本地 VS Code 已经登录过 Codex，远程 SSH 窗口仍然可能要求重新登录或配置 API Key。

打开 Codex 图标后，按提示完成认证。常见方式包括：

```text
使用 ChatGPT / OpenAI 账号登录
或配置 OpenAI API Key
```

认证完成后，Codex 才能在远程窗口中读取当前目录、辅助修改文件，并根据远程工作区上下文执行任务。

## 常见现象

### 1. 本地窗口有 Codex 图标，远程窗口没有

优先检查 Codex 是否安装到了远程 SSH 窗口。只在本地安装并不等于远程可用。

### 2. 扩展页显示已安装，但远程侧边栏还是没有图标

确认当前窗口左下角是否显示 `SSH: remote-dev`。如果不是远程窗口，说明你还在本地环境。若已经是远程窗口，执行 `Developer: Reload Window`。

### 3. 远程窗口提示需要登录

这是正常现象。远程主机和本地客户端的认证状态可能不同，需要重新完成 Codex 登录或 API Key 配置。

### 4. 远程主机空间很小

Codex 扩展、VS Code Server 和其他远程扩展都会占用远程磁盘。如果是只有 5G 左右存储的小型 VPS，建议先检查空间：

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

空间不足时，远程扩展可能安装失败，Codex 图标也可能无法正常显示。

## 小结

把 VS Code Remote SSH 和 Codex 放在一起使用时，要记住一个区别：本地 VS Code 客户端和远程 SSH 窗口不是同一个扩展运行环境。本地装过 Codex，不代表远程窗口已经装好；本地认证过，也不代表远程窗口已经认证。

实践顺序可以固定为：

```text
连接 Remote SSH
打开远程目录
在远程窗口安装 Codex
重载或重启 VS Code 窗口
重新完成 Codex 认证
确认 Codex 图标出现在远程窗口侧边栏
```

这样处理后，Codex 才会像本地窗口一样，在远程主机的工作区里正常显示和使用。

## 参考

- Codex IDE 扩展文档：<https://developers.openai.com/codex/ide>
- Codex CLI 文档：<https://developers.openai.com/codex/cli>
- VS Code Remote SSH 文档：<https://code.visualstudio.com/docs/remote/ssh>
