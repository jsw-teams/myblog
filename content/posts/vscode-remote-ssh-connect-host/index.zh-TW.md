---
title: "使用 VS Code Remote SSH 連接遠端主機：從金鑰到工作區"
description: "在 Windows 上透過 VS Code Remote SSH 連接遠端 Linux 主機，把遠端目錄當成本機專案一樣編輯、執行與除錯。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "開發效率"
draft: false
cover: ""
---

遠端開發的核心不是「把檔案傳來傳去」，而是讓編輯器、終端機、Git、依賴安裝、建置命令與日誌排障盡量靠近真實執行環境。VS Code Remote SSH 的價值就在這裡：本機 Windows 只負責互動，遠端主機負責保存程式碼、執行命令與承載開發環境。

這篇文章記錄一套可重複使用的 Windows + VS Code + SSH 遠端開發流程。

## 適用場景

這個方案適合以下幾類工作：

- 部落格、文件站、靜態站點的遠端寫作與建置；
- Node.js、Astro、Vite、Next.js 等專案的伺服器側除錯；
- 在雲主機、NAS、軟路由或開發機上維護長期執行的專案；
- 希望減少「本機能跑，伺服器不能跑」這類環境偏差。

如果專案最終部署在 Linux 或 Cloudflare Pages，遠端開發能讓依賴、換行符、腳本執行權限與建置命令更接近線上環境。

## 準備連線資訊

連線前先準備四個資訊：

```text
HostName：遠端主機公網 IP 或網域
User：遠端使用者名稱，例如 root、ubuntu、debian 或自訂使用者
Port：SSH 連接埠，預設 22，也可以是自訂連接埠
IdentityFile：本機私鑰路徑
```

Windows 10/11 通常已經內建 OpenSSH Client。可以在 PowerShell 中檢查：

```powershell
ssh -V
```

如果能看到 OpenSSH 版本，表示本機 SSH 用戶端可用。

## 產生 SSH 金鑰

在 PowerShell 中執行：

```powershell
ssh-keygen -t ed25519 -C "vscode-remote"
```

預設會產生：

```text
C:\Users\User\.ssh\id_ed25519
C:\Users\User\.ssh\id_ed25519.pub
```

其中：

- `id_ed25519` 是私鑰，只保存在本機；
- `id_ed25519.pub` 是公鑰，可以放到遠端主機的 `authorized_keys`。

複製公鑰內容：

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

然後把這段內容追加到遠端主機的：

```bash
~/.ssh/authorized_keys
```

遠端主機上的權限建議設定為：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 設定 Windows SSH Host

編輯本機檔案：

```text
C:\Users\User\.ssh\config
```

加入一個主機別名：

```sshconfig
Host blog-dev
  HostName 你的伺服器IP或網域
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

儲存後，在 PowerShell 中測試：

```powershell
ssh blog-dev
```

如果能進入遠端 Shell，表示 SSH 設定已經可用。

## 在 VS Code 中連接

安裝 VS Code 擴充套件：

```text
Remote - SSH
```

然後執行：

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

首次連接時，VS Code 會在遠端主機安裝 VS Code Server。連接成功後，選擇遠端目錄，例如：

```bash
/root/projects/blog.js.gripe
```

或：

```bash
/home/deploy/projects/blog.js.gripe
```

這樣，本機 VS Code 開啟的就是遠端目錄，而不是本機副本。

## 複製或進入部落格專案

如果遠端主機上還沒有專案，可以在 VS Code 的遠端終端機執行：

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/jsw-teams/myblog.git blog.js.gripe
cd blog.js.gripe
```

如果已經存在專案，直接進入：

```bash
cd ~/projects/blog.js.gripe
git status
```

建議先確認遠端位址：

```bash
git remote -v
```

如果需要切回正確遠端：

```bash
git remote set-url origin https://github.com/jsw-teams/myblog.git
```

## 遠端安裝依賴並建置

在遠端終端機執行：

```bash
npm install
npm run build
npm run check
```

這樣做的好處是建置環境和遠端部署環境更一致。對於部落格類專案，建議每次新增文章後至少執行一次 `npm run build`，再執行 `npm run check`。

## 推薦工作流

我通常會把遠端開發流程拆成五步：

```text
連接遠端主機
開啟遠端專案目錄
新增或修改 Markdown 內容
執行 build/check
git commit && git push
```

對應命令可以是：

```bash
git status
npm run build
npm run check
git add content/posts
git commit -m "docs: add remote development articles"
git push origin main
```

如果主分支有保護規則，則使用分支：

```bash
git checkout -b docs/remote-dev-posts
git push -u origin docs/remote-dev-posts
```

然後在 GitHub 上建立 Pull Request。

## 常見問題

### 1. 第一次連線很慢

首次連接時，VS Code 會在遠端主機安裝服務端元件。只要網路穩定，等待安裝完成即可。後續連接通常會明顯更快。

### 2. 金鑰明明正確但仍然要求密碼

優先檢查三處：

```bash
ls -ld ~/.ssh
ls -l ~/.ssh/authorized_keys
```

權限建議：

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

另外確認本機 `IdentityFile` 指向的是私鑰，而不是 `.pub` 公鑰。

### 3. known_hosts 報錯

如果伺服器重裝過系統或 IP 被重複使用，本機可能出現 host key 衝突。可以先確認確實是你的伺服器，再清理舊記錄：

```powershell
ssh-keygen -R 伺服器IP或網域
```

然後重新連線。

### 4. 遠端終端機找不到 node 或 npm

表示遠端主機沒有安裝 Node.js，或 PATH 沒設定好。建議用 nvm 管理 Node.js 版本：

```bash
node -v
npm -v
```

如果命令不存在，需要先安裝 Node.js，再重新開啟 VS Code 遠端視窗。

## 小結

VS Code Remote SSH 的重點不是「遠端桌面」，而是把開發上下文放到遠端主機裡：程式碼、終端機、Git、依賴與建置命令都在同一個環境中執行。對於 `blog.js.gripe` 這種靜態部落格專案，它能讓文章寫作、建置檢查、提交推送與部署驗證形成穩定閉環。

## 參考

- VS Code Remote SSH 文件：<https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace：<https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
