---
title: "Using VS Code Remote SSH to Connect to a Remote Host: From Keys to Workspace"
description: "A practical Windows workflow for connecting VS Code to a remote Linux host over SSH and editing, running, and troubleshooting a project directly on the server."
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "Development Efficiency"
draft: false
cover: ""
---

Remote development is not just about moving files between machines. The real goal is to keep the editor, terminal, Git, dependencies, build commands, and troubleshooting workflow close to the environment where the project actually runs. VS Code Remote SSH does exactly that: Windows handles the local UI, while the remote host stores code, runs commands, and provides the development environment.

This article documents a reusable Windows + VS Code + SSH workflow for remote development.

## When this workflow is useful

This setup is suitable for:

- writing and building blogs, documentation sites, and static sites remotely;
- debugging Node.js, Astro, Vite, Next.js, and similar projects on a server;
- maintaining long-running projects on a cloud VM, NAS, router, or development machine;
- reducing environment drift between "works on my machine" and "fails on the server."

If the project is ultimately deployed from Linux or to Cloudflare Pages, remote development keeps dependencies, line endings, script permissions, and build commands closer to production.

## Prepare the connection details

Before connecting, prepare four values:

```text
HostName: public IP address or domain of the remote host
User: remote user, such as root, ubuntu, debian, or a custom user
Port: SSH port, usually 22 unless customized
IdentityFile: path to the local private key
```

Windows 10/11 usually includes the OpenSSH client. Check it in PowerShell:

```powershell
ssh -V
```

If an OpenSSH version is printed, the local SSH client is available.

## Generate an SSH key

Run this in PowerShell:

```powershell
ssh-keygen -t ed25519 -C "vscode-remote"
```

By default, this creates:

```text
C:\Users\User\.ssh\id_ed25519
C:\Users\User\.ssh\id_ed25519.pub
```

Where:

- `id_ed25519` is the private key and should stay on your local machine;
- `id_ed25519.pub` is the public key and can be added to the remote host.

Print the public key:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Append it to the remote host's file:

```bash
~/.ssh/authorized_keys
```

Recommended permissions on the remote host:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Configure the Windows SSH host

Edit the local file:

```text
C:\Users\User\.ssh\config
```

Add a host alias:

```sshconfig
Host blog-dev
  HostName your-server-ip-or-domain
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

Save the file, then test it in PowerShell:

```powershell
ssh blog-dev
```

If you can enter the remote shell, the SSH configuration is ready.

## Connect from VS Code

Install the VS Code extension:

```text
Remote - SSH
```

Then run:

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

On the first connection, VS Code installs VS Code Server on the remote host. After the connection succeeds, open a remote directory, for example:

```bash
/root/projects/blog.js.gripe
```

or:

```bash
/home/deploy/projects/blog.js.gripe
```

Now VS Code is editing the remote directory rather than a local copy.

## Clone or open the blog project

If the project does not exist on the remote host yet, run this in VS Code's remote terminal:

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/jsw-teams/myblog.git blog.js.gripe
cd blog.js.gripe
```

If it already exists, enter it directly:

```bash
cd ~/projects/blog.js.gripe
git status
```

Check the remote URL:

```bash
git remote -v
```

If it needs to be corrected:

```bash
git remote set-url origin https://github.com/jsw-teams/myblog.git
```

## Install dependencies and build remotely

Run the project commands in the remote terminal:

```bash
npm install
npm run build
npm run check
```

This keeps the build environment closer to the deployment environment. For a blog project, it is a good practice to run at least `npm run build` and then `npm run check` after adding new posts.

## Recommended workflow

A practical remote workflow has five steps:

```text
Connect to the remote host
Open the remote project directory
Add or edit Markdown content
Run build/check
git commit && git push
```

Example commands:

```bash
git status
npm run build
npm run check
git add content/posts
git commit -m "docs: add remote development articles"
git push origin main
```

If the main branch is protected, use a feature branch:

```bash
git checkout -b docs/remote-dev-posts
git push -u origin docs/remote-dev-posts
```

Then create a Pull Request on GitHub.

## Common issues

### 1. The first connection is slow

On the first connection, VS Code installs server-side components on the remote host. As long as the network is stable, let the setup finish. Later connections are usually much faster.

### 2. The key is correct but SSH still asks for a password

Check these paths first:

```bash
ls -ld ~/.ssh
ls -l ~/.ssh/authorized_keys
```

Recommended permissions:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Also confirm that the local `IdentityFile` points to the private key, not the `.pub` public key.

### 3. known_hosts error

If the server was reinstalled or the IP was reused, the local host key may conflict. Confirm that the host is yours, then remove the old record:

```powershell
ssh-keygen -R server-ip-or-domain
```

Reconnect afterward.

### 4. The remote terminal cannot find node or npm

The remote host may not have Node.js installed, or its PATH may be wrong. Check:

```bash
node -v
npm -v
```

If the commands are missing, install Node.js first, then reopen the VS Code remote window.

## Summary

VS Code Remote SSH is not a remote desktop replacement. Its purpose is to put the development context on the remote host: code, terminal, Git, dependencies, and build commands all run in the same environment. For a static blog such as `blog.js.gripe`, this creates a stable loop for writing, building, committing, pushing, and verifying deployment.

## References

- VS Code Remote SSH docs: <https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace: <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
