---
title: "VS Code Remote SSH 連接後安裝 Codex：為什麼遠端視窗需要重新安裝和認證"
description: "透過 VS Code Remote SSH 連接遠端主機後，Codex 需要在遠端視窗中重新安裝並重新認證，否則側邊欄圖示和功能可能不會像本機視窗那樣顯示。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "vscode-remote-codex-dev-efficiency"
tags: ["VS Code", "Remote SSH", "Codex"]
category: "開發效率"
draft: false
cover: ""
---

使用 VS Code Remote SSH 連接遠端主機後，經常會遇到一個容易誤解的現象：本機 VS Code 明明已經安裝了 Codex 擴充套件，切到遠端 SSH 視窗後，Codex 圖示卻沒有像本機視窗那樣出現在側邊欄。

原因很簡單：Remote SSH 開啟的不是普通本機視窗，而是連接到遠端主機的遠端視窗。VS Code 會在遠端主機上執行一套遠端擴充套件環境。本機安裝過的擴充套件和本機登入狀態，不一定會自動帶到遠端主機裡。對 Codex 來說，遠端視窗通常需要重新安裝一次擴充套件，並重新完成一次認證。

下面用一個泛化主機名 `remote-dev` 舉例，避免把真實伺服器名稱寫進教學。

## 前提

繼續之前，先確認你已經完成了 VS Code Remote SSH 連接：

```text
左側遠端資源管理器中能看到 SSH 主機 remote-dev
主機狀態顯示已連接
目前視窗左下角顯示 SSH: remote-dev
遠端終端機提示字元來自遠端主機
```

如果目前開啟的還是本機 Windows 目錄，例如 `C:\Users\User\Desktop`，那還不是遠端工作區。需要先從遠端資源管理器中連接主機，並開啟遠端目錄，例如：

```bash
/opt
```

或：

```bash
/home/deploy
```

## 為什麼本機裝過 Codex 還要遠端再裝

VS Code Remote SSH 連接後，擴充套件大致分成兩類：

- 本機 UI 側擴充套件：執行在本機 VS Code 用戶端中；
- 遠端工作區擴充套件：執行在遠端主機的 VS Code Server 環境中。

Codex 需要讀取目前工作區、顯示側邊欄入口，並和遠端目錄中的檔案互動。遠端 SSH 視窗裡的工作區在遠端主機上，所以只在本機裝過 Codex 並不夠。你需要在遠端視窗裡安裝 Codex，安裝位置通常會顯示為類似：

```text
Install in SSH: remote-dev
```

安裝完成後，Codex 圖示才會在這個遠端視窗裡正常出現。

## 安裝步驟

### 1. 先連接 Remote SSH

開啟 VS Code 左側遠端資源管理器，選擇 `遠端(隧道/SSH)`，在 `SSH` 下連接示例主機：

```text
remote-dev
```

連接成功後，開啟一個遠端目錄，例如 `/opt`。這一步很重要，因為 Codex 要安裝到目前遠端視窗，而不是普通本機視窗。

### 2. 在遠端視窗安裝 Codex 擴充套件

開啟擴充套件面板：

```text
Ctrl + Shift + X
```

搜尋：

```text
Codex
```

如果擴充套件已經在本機安裝過，但遠端視窗還不能使用，擴充套件頁面通常會出現遠端安裝入口。選擇類似下面的按鈕：

```text
Install in SSH: remote-dev
```

不要只看本機是否已經安裝。關鍵是確認目前遠端 SSH 視窗也安裝了 Codex。

### 3. 重載或重啟 VS Code 視窗

安裝完成後，如果側邊欄沒有立即出現 Codex 圖示，可以執行：

```text
Ctrl + Shift + P
Developer: Reload Window
```

也可以直接關閉目前遠端視窗，再重新透過 Remote SSH 連接 `remote-dev`。很多時候，重載視窗後 Codex 圖示才會穩定顯示。

### 4. 重新認證 Codex

遠端視窗裡的 Codex 需要單獨認證。即使本機 VS Code 已經登入過 Codex，遠端 SSH 視窗仍然可能要求重新登入或設定 API Key。

開啟 Codex 圖示後，按提示完成認證。常見方式包括：

```text
使用 ChatGPT / OpenAI 帳號登入
或設定 OpenAI API Key
```

認證完成後，Codex 才能在遠端視窗中讀取目前目錄、輔助修改檔案，並根據遠端工作區上下文執行任務。

## 常見現象

### 1. 本機視窗有 Codex 圖示，遠端視窗沒有

優先檢查 Codex 是否安裝到了遠端 SSH 視窗。只在本機安裝並不等於遠端可用。

### 2. 擴充套件頁顯示已安裝，但遠端側邊欄還是沒有圖示

確認目前視窗左下角是否顯示 `SSH: remote-dev`。如果不是遠端視窗，表示你還在本機環境。若已經是遠端視窗，執行 `Developer: Reload Window`。

### 3. 遠端視窗提示需要登入

這是正常現象。遠端主機和本機用戶端的認證狀態可能不同，需要重新完成 Codex 登入或 API Key 設定。

### 4. 遠端主機空間很小

Codex 擴充套件、VS Code Server 和其他遠端擴充套件都會占用遠端磁碟。如果是只有 5G 左右儲存的小型 VPS，建議先檢查空間：

```bash
df -h
du -sh ~/.vscode-server ~/.cache 2>/dev/null
```

空間不足時，遠端擴充套件可能安裝失敗，Codex 圖示也可能無法正常顯示。

## 小結

把 VS Code Remote SSH 和 Codex 放在一起使用時，要記住一個區別：本機 VS Code 用戶端和遠端 SSH 視窗不是同一個擴充套件執行環境。本機裝過 Codex，不代表遠端視窗已經裝好；本機認證過，也不代表遠端視窗已經認證。

實踐順序可以固定為：

```text
連接 Remote SSH
開啟遠端目錄
在遠端視窗安裝 Codex
重載或重啟 VS Code 視窗
重新完成 Codex 認證
確認 Codex 圖示出現在遠端視窗側邊欄
```

這樣處理後，Codex 才會像本機視窗一樣，在遠端主機的工作區裡正常顯示和使用。

## 參考

- Codex IDE 擴充套件文件：<https://developers.openai.com/codex/ide>
- Codex CLI 文件：<https://developers.openai.com/codex/cli>
- VS Code Remote SSH 文件：<https://code.visualstudio.com/docs/remote/ssh>
