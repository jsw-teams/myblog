---
title: "Using VS Code Remote SSH to Connect to a Remote Host: From Extension to Remote Folder"
description: "A practical Windows workflow for connecting VS Code to a remote Linux host over SSH, configuring an SSH Host, and opening a remote folder from Remote Explorer."
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "Development Efficiency"
draft: false
cover: ""
---

Remote development is not just about moving files between machines. The practical goal is to let local VS Code open a folder that actually lives on a remote host. VS Code Remote SSH does exactly that: Windows handles the UI and interaction, while the remote host stores files and provides the remote terminal.

This article focuses on the practical connection setup. VS Code Remote SSH commonly supports two ways to connect to a server: SSH key authentication and password authentication.

## When this workflow is useful

This setup is suitable for:

- editing remote files directly on a cloud VM, NAS, router, or development machine;
- managing remote folders and remote terminals from VS Code;
- avoiding repeated manual file sync through SFTP, scp, or a file manager;
- switching quickly between multiple remote hosts.

This article only covers connecting VS Code to a remote host. It does not cover cloning projects, installing dependencies, or running builds.

## Prepare the connection details

Before connecting, prepare these values:

```text
HostName: public IP address or domain of the remote host
User: remote user, such as root, ubuntu, debian, or a custom user
Port: SSH port, usually 22 unless customized
IdentityFile: path to the local private key, required for key-based login
Password: remote user password, required for password login, not recommended to store in config
```

Windows 10/11 usually includes the OpenSSH client. Check it in PowerShell:

```powershell
ssh -V
```

If an OpenSSH version is printed, the local SSH client is available.

## Option 1: key-based login

Key-based login is the recommended approach. It avoids typing the server password repeatedly and works better for long-term VS Code Remote SSH use.

### Generate an SSH key

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

After the public key is ready, use the local private key path in the VS Code SSH Host configuration later.

## Option 2: password login

For a temporary test server, or before you have configured a public key, you can also use password login. In this case, the local SSH Host config does not need an `IdentityFile`. If the server allows password login, VS Code Remote SSH will prompt for the remote user's password when connecting to this Host.

Password login depends on the remote SSH server allowing `PasswordAuthentication`. Some VPS images disable password login by default and only allow key-based login. If you enable password login, use a strong password and consider pairing it with a non-default port, firewall rules, or Fail2ban-style login protection.

## Connection steps

### 1. Install the Remote - SSH extension

Install the VS Code extension:

```text
Remote - SSH
```

After installation, restart VS Code once so Remote Explorer, the command palette entries, and SSH configuration entry points are refreshed.

### 2. Configure the SSH Host

Open the command palette:

```text
Ctrl + Shift + P
Remote-SSH: Open SSH Configuration File...
```

Choose the SSH config file under your Windows user directory:

```text
C:\Users\User\.ssh\config
```

For key-based login, add a config like this:

```sshconfig
Host blog-dev
  HostName your-server-ip-or-domain
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

For password login, omit `IdentityFile`:

```sshconfig
Host blog-dev-password
  HostName your-server-ip-or-domain
  User root
  Port 22
  PreferredAuthentications password,keyboard-interactive
```

After saving the config, the Host appears in VS Code's Remote Explorer.

### 3. Connect to the remote host

You can connect from the command palette:

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

Or click the Remote Explorer icon in the left activity bar, switch to the `Remote (Tunnels/SSH)` view, expand `SSH`, and connect to the Host you configured. After the connection succeeds, the Host will show a connected state.

On the first connection, VS Code installs VS Code Server on the remote host. For password login, VS Code prompts for the remote user's password. For key-based login, it usually opens the remote window directly.

### 4. Open a remote folder

After connecting, expand the Host in Remote Explorer and choose a remote folder to open, for example:

```bash
/opt
```

or:

```bash
/home/deploy
```

After that, the local VS Code window is operating on the remote folder. Editing files, opening terminals, and saving content all happen on the remote host.

## Limits on small VPS disks

On the first connection, VS Code Remote SSH installs VS Code Server on the remote host, usually under:

```bash
~/.vscode-server
```

Remote extensions, multiple remote windows, and old VS Code Server versions also consume disk space on the server. On small edgeproxy-style VPS instances with only around 5 GB of allocated storage, this can become a real limitation. `~/.vscode-server` and remote extension caches can fill the disk. Once the disk is full, VS Code Server installation may fail, the remote terminal may behave oddly, and file saves may fail.

Before using a small VPS for Remote SSH, check the available space:

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

If space is tight, reduce the number of remote extensions or delete old VS Code Server version directories:

```bash
rm -rf ~/.vscode-server/bin/<old-version-directory>
```

If the VPS is mainly used for proxying, forwarding, or lightweight services, it is usually not a good long-term development machine. Remote SSH works best on a host with some spare disk, memory, and CPU headroom.

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

## Summary

VS Code Remote SSH is not a remote desktop replacement. It lets VS Code manage folders on a remote host directly over SSH. In practice, the sequence is simple: install the Remote - SSH extension, restart VS Code, configure the SSH Host, then connect from Remote Explorer and open a remote folder.

## References

- VS Code Remote SSH docs: <https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace: <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
