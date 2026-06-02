---
title: "Installing Codex After Connecting with VS Code Remote SSH: Why the Remote Window Needs Its Own Install and Login"
description: "After connecting to a remote host with VS Code Remote SSH, Codex usually needs to be installed and authenticated again inside the remote window before its sidebar icon and features appear."
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-codex-dev-efficiency"
tags: ["VS Code", "Remote SSH", "Codex"]
category: "Development Efficiency"
draft: false
cover: ""
---

After connecting to a remote host with VS Code Remote SSH, it is easy to hit a confusing situation: Codex is already installed in local VS Code, but after switching to the remote SSH window, the Codex icon does not appear in the sidebar like it does locally.

The reason is simple: a Remote SSH window is not just a normal local window. VS Code runs a remote extension environment on the remote host. Extensions and login state from the local client are not always carried into that remote environment. For Codex, the remote window usually needs its own extension install and its own authentication step.

This article uses the generic host name `remote-dev` so no real server name is exposed.

## Before You Start

First confirm that VS Code Remote SSH is already connected:

```text
Remote Explorer shows the SSH host remote-dev
The host is connected
The lower-left corner shows SSH: remote-dev
The integrated terminal prompt comes from the remote host
```

If the current window is still showing a local Windows path such as `C:\Users\User\Desktop`, it is not a remote workspace yet. Connect from Remote Explorer and open a remote folder such as:

```bash
/opt
```

or:

```bash
/home/deploy
```

## Why Codex Must Be Installed Again Remotely

After a Remote SSH connection, VS Code extensions roughly fall into two places:

- local UI-side extensions, running in the local VS Code client;
- remote workspace extensions, running in the VS Code Server environment on the remote host.

Codex needs to read the current workspace, show a sidebar entry, and interact with files in the remote folder. Because the workspace in a Remote SSH window lives on the remote host, having Codex installed only on the local client is not enough. You need to install Codex in the remote window, usually through an action like:

```text
Install in SSH: remote-dev
```

After that, the Codex icon can appear normally in that remote window.

## Installation Steps

### 1. Connect with Remote SSH First

Open Remote Explorer in VS Code, choose `Remote (Tunnels/SSH)`, expand `SSH`, and connect to the example host:

```text
remote-dev
```

After the connection succeeds, open a remote folder such as `/opt`. This matters because Codex needs to be installed into the current remote window, not just the local VS Code window.

### 2. Install the Codex Extension in the Remote Window

Open the Extensions view:

```text
Ctrl + Shift + X
```

Search for:

```text
Codex
```

If Codex is already installed locally but not available in the remote window, the extension page usually shows a remote install action. Choose the button that looks like:

```text
Install in SSH: remote-dev
```

Do not only check whether Codex is installed locally. The important part is whether it is installed in the current remote SSH window.

### 3. Reload or Restart the VS Code Window

If the Codex icon does not appear immediately after installation, run:

```text
Ctrl + Shift + P
Developer: Reload Window
```

You can also close the current remote window and reconnect to `remote-dev` through Remote SSH. In many cases, the icon appears reliably after a reload.

### 4. Authenticate Codex Again

Codex in the remote window needs its own authentication. Even if local VS Code has already authenticated Codex, the Remote SSH window may still ask you to sign in again or configure an API key.

Open the Codex icon and follow the prompt. Common options include:

```text
Sign in with a ChatGPT / OpenAI account
or configure an OpenAI API key
```

After authentication, Codex can read the current remote folder, help edit files, and work with the remote workspace context.

## Common Symptoms

### 1. The local window has a Codex icon, but the remote window does not

First check whether Codex is installed in the remote SSH window. Local installation does not automatically mean remote availability.

### 2. The extension page says installed, but the sidebar still has no icon

Check whether the lower-left corner says `SSH: remote-dev`. If not, you are still in a local window. If you are already in the remote window, run `Developer: Reload Window`.

### 3. The remote window asks you to sign in

That is normal. The remote host and local client may not share the same authentication state. Complete Codex sign-in or API key configuration again.

### 4. The remote host has very little disk space

Codex, VS Code Server, and other remote extensions all consume remote disk space. On a small VPS with around 5 GB of storage, check the available space first:

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

If space is exhausted, remote extension installation may fail and the Codex icon may not appear.

## Summary

When using VS Code Remote SSH with Codex, remember the key distinction: the local VS Code client and the remote SSH window are not the same extension runtime. Codex installed locally does not mean Codex is installed remotely; Codex authenticated locally does not mean the remote window is already authenticated.

A reliable sequence is:

```text
Connect with Remote SSH
Open a remote folder
Install Codex in the remote window
Reload or restart the VS Code window
Authenticate Codex again
Confirm that the Codex icon appears in the remote sidebar
```

After that, Codex can behave in the remote host workspace much like it does in a local VS Code window.

## References

- Codex IDE extension docs: <https://developers.openai.com/codex/ide>
- Codex CLI docs: <https://developers.openai.com/codex/cli>
- VS Code Remote SSH docs: <https://code.visualstudio.com/docs/remote/ssh>
