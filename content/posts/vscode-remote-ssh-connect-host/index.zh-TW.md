---
title: "使用 VS Code Remote SSH 連接遠端主機：從外掛到遠端目錄"
description: "在 Windows 上透過 VS Code Remote SSH 連接遠端 Linux 主機，設定 SSH Host，並在遠端資源管理器中開啟遠端目錄。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-ssh-connect-host"
tags: ["VS Code", "Remote SSH"]
category: "開發效率"
draft: false
cover: ""
---

遠端開發的核心不是「把檔案傳來傳去」，而是讓本機 VS Code 直接開啟遠端主機上的目錄。VS Code Remote SSH 的價值就在這裡：本機 Windows 負責介面和互動，遠端主機負責保存檔案並提供遠端終端機。

這篇文章從實際連接遠端主機的角度出發，記錄 VS Code Remote SSH 的兩種常見設定方式：金鑰對登入和密碼登入。

## 適用場景

這個方案適合以下幾類工作：

- 在雲主機、NAS、軟路由或開發機上直接編輯遠端檔案；
- 需要用 VS Code 管理遠端目錄和遠端終端機；
- 不想頻繁透過 SFTP、scp 或檔案管理器手動同步檔案；
- 希望在多個遠端主機之間快速切換。

這篇文章只討論如何連接遠端主機，不展開專案複製、依賴安裝或建置流程。

## 準備連線資訊

連線前先準備這些資訊：

```text
HostName：遠端主機公網 IP 或網域
User：遠端使用者名稱，例如 root、ubuntu、debian 或自訂使用者
Port：SSH 連接埠，預設 22，也可以是自訂連接埠
IdentityFile：本機私鑰路徑，使用金鑰登入時需要
Password：遠端使用者密碼，使用密碼登入時需要，不建議寫入 config
```

Windows 10/11 通常已經內建 OpenSSH Client。可以在 PowerShell 中檢查：

```powershell
ssh -V
```

如果能看到 OpenSSH 版本，表示本機 SSH 用戶端可用。

## 方式一：使用金鑰對登入

金鑰對登入是更推薦的方式。它不需要每次輸入伺服器密碼，也更適合長期使用 VS Code Remote SSH。

### 產生 SSH 金鑰

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

準備好公鑰後，後面在 VS Code 的 SSH Host 設定裡填入本機私鑰路徑即可。

## 方式二：使用密碼登入

如果只是臨時連接一台測試主機，或者還沒有來得及設定公鑰，也可以直接使用密碼登入。此時本機 SSH Host 設定不需要寫 `IdentityFile`。如果伺服器允許密碼登入，VS Code Remote SSH 連接這個 Host 時會跳出密碼輸入框。

需要注意的是，密碼登入依賴遠端 SSH 服務端允許 `PasswordAuthentication`。有些 VPS 映像預設關閉密碼登入，只允許金鑰登入；如果開啟密碼登入，建議配合強密碼、非預設連接埠、防火牆或 Fail2ban 一類的登入保護策略。

## 連接步驟

### 1. 安裝 Remote - SSH 擴充套件

安裝 VS Code 擴充套件：

```text
Remote - SSH
```

安裝完成後建議重啟一次 VS Code，避免左側遠端資源管理器、命令面板和 SSH 設定入口沒有立即刷新。

### 2. 設定 SSH Host

開啟命令面板：

```text
Ctrl + Shift + P
Remote-SSH: Open SSH Configuration File...
```

選擇 Windows 使用者目錄下的 SSH 設定檔：

```text
C:\Users\User\.ssh\config
```

如果使用金鑰登入，寫入類似設定：

```sshconfig
Host blog-dev
  HostName 你的伺服器IP或網域
  User root
  Port 22
  IdentityFile C:\Users\User\.ssh\id_ed25519
  ServerAliveInterval 30
  ServerAliveCountMax 3
```

如果使用密碼登入，可以不寫 `IdentityFile`：

```sshconfig
Host blog-dev-password
  HostName 你的伺服器IP或網域
  User root
  Port 22
  PreferredAuthentications password,keyboard-interactive
```

儲存設定後，VS Code 的遠端資源管理器中會出現對應的 Host。

### 3. 連接遠端主機

連接方式有兩種。可以繼續使用命令面板：

```text
Ctrl + Shift + P
Remote-SSH: Connect to Host...
blog-dev
```

也可以點擊左側活動列的遠端資源管理器圖示，在 `遠端(隧道/SSH)` 視圖裡展開 `SSH`，選擇剛設定的主機並連接。連接成功後，主機旁邊會顯示已連接狀態。

首次連接時，VS Code 會在遠端主機安裝 VS Code Server。如果使用密碼登入，VS Code 會跳出密碼輸入框；如果使用金鑰登入，通常會直接進入遠端視窗。

### 4. 開啟遠端目錄

連接成功後，在遠端資源管理器中展開主機，選擇需要開啟的遠端目錄，例如：

```bash
/opt
```

或：

```bash
/home/deploy
```

開啟後，本機 VS Code 視窗實際操作的是遠端主機上的目錄。後續在資源管理器中編輯檔案、開啟終端機、保存內容，都會發生在遠端主機上。

## 小容量 VPS 的限制

VS Code Remote SSH 首次連接時會在遠端主機安裝 VS Code Server，通常位於：

```bash
~/.vscode-server
```

後續安裝遠端擴充套件、開啟多個遠端視窗或保留舊版本 VS Code Server 時，也會繼續占用遠端磁碟。對於 edgeproxy 這類只有 5G 左右儲存分配的小型 VPS，這個限制會比較明顯：`~/.vscode-server` 和遠端擴充套件快取疊加後，可能把磁碟占滿。磁碟滿了以後，常見表現包括 VS Code Server 安裝失敗、遠端終端機異常、檔案保存失敗。

連接前建議先檢查空間：

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

如果空間緊張，可以優先減少遠端擴充套件數量，或者移除舊的 VS Code Server 版本目錄：

```bash
rm -rf ~/.vscode-server/bin/<舊版本目錄>
```

如果這台 VPS 主要用於代理、轉發或輕量服務，不建議把它當成完整開發機長期使用。Remote SSH 更適合磁碟空間、記憶體和 CPU 都有一定餘量的遠端主機。

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

## 小結

VS Code Remote SSH 的重點不是「遠端桌面」，而是讓 VS Code 透過 SSH 直接管理遠端主機上的目錄。實際使用時，把順序記住就夠了：安裝 Remote - SSH 擴充套件，重啟 VS Code，設定 SSH Host，然後從遠端資源管理器連接主機並開啟目錄。

## 參考

- VS Code Remote SSH 文件：<https://code.visualstudio.com/docs/remote/ssh>
- VS Code Remote SSH Marketplace：<https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh>
