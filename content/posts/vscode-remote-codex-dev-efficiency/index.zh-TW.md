---
title: "把 VS Code 遠端開發與 Codex 結合：讓遠端主機成為高效開發工作台"
description: "透過 VS Code Remote SSH、Codex IDE 擴充套件與 Codex CLI，把遠端主機上的真實專案環境變成可協作、可建置、可審查的開發工作台。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "vscode-remote-codex-dev-efficiency"
tags: ["VS Code", "Remote SSH", "Codex"]
category: "開發效率"
draft: false
cover: ""
---

單獨使用 VS Code Remote SSH，可以把專案放在遠端主機上開發；單獨使用 Codex，可以讓 AI 協助理解程式碼、修改檔案、執行命令與產生方案。把兩者結合起來，遠端主機就不只是「伺服器」，而是一個帶有 AI 協作能力的開發工作台。

這篇文章記錄一種適合 `blog.js.gripe` 這類靜態部落格專案，也適合 API、閘道、控制台與自動化腳本專案的開發模式。

## 總體架構

推薦的工作流如下：

```text
Windows 本機 VS Code
        ↓ Remote SSH
遠端 Linux 專案目錄
        ↓
Codex IDE 擴充套件 / Codex CLI
        ↓
Git 分支、建置檢查、提交推送
```

本機只保留編輯器 UI 與認證入口，真正的程式碼、依賴、建置命令與 Git 狀態都在遠端主機上。

這種結構有三個優勢：

1. 遠端環境更接近部署環境；
2. Codex 取得的是目前專案的真實上下文；
3. 建置與檢查命令可以直接在遠端終端機執行，減少環境差異。

## 方式一：使用 Codex IDE 擴充套件

在 VS Code 中安裝 Codex IDE 擴充套件後，可以在側邊欄中開啟 Codex。對於遠端視窗，建議先確認你目前開啟的是遠端工作區，而不是本機目錄：

```text
左下角應顯示 SSH: blog-dev
檔案總管開啟的是遠端路徑，例如 /home/deploy/projects/blog.js.gripe
```

然後可以讓 Codex 基於目前工作區執行任務，例如：

```text
請閱讀 content/posts 的現有文章結構，按照目前 frontmatter 規範新增一篇關於 Remote SSH 的中文文章，並保持 translationKey 命名一致。
```

這類任務適合：

- 新增部落格文章；
- 產生 frontmatter；
- 檢查 Markdown 連結；
- 解釋專案結構；
- 修改小範圍程式碼；
- 產生提交說明。

## 方式二：在遠端終端機使用 Codex CLI

如果更偏好命令列工作流，可以在遠端主機中安裝 Codex CLI：

```bash
npm i -g @openai/codex
```

進入專案目錄後執行：

```bash
cd ~/projects/blog.js.gripe
codex
```

首次執行時需要登入或設定 API Key。CLI 模式的優勢是和遠端 Shell 更貼近，適合直接圍繞 Git、建置命令、腳本與檔案修改進行協作。

常見用法：

```text
請檢查這個 Astro 靜態部落格的 content/posts 結構，告訴我新增三語言文章時應該使用哪些檔名。
```

或：

```text
請根據專案說明文件的規範，為新增文章產生 zh-CN、zh-TW、en 三個版本，並在完成後執行 npm run build 和 npm run check。
```

## 為 Codex 提供清楚邊界

和 AI 協作時，最重要的是邊界清楚。建議每次任務都說明四件事：

```text
目標：要完成什麼
範圍：允許改哪些目錄或檔案
驗證：完成後需要執行哪些命令
限制：不要改哪些內容
```

例如：

```text
目標：新增一篇關於 GitHub Webhook 觸發 Cloudflare Pages 重新部署的文章。
範圍：只允許修改 content/posts/github-webhook-blog-redeploy 下的 Markdown 檔案。
驗證：完成後執行 npm run build 和 npm run check。
限制：不要修改 package.json、astro.config.mjs、src 目錄和 wrangler.toml。
```

這樣可以降低誤改核心設定的風險。

## 建議的目錄策略

對於多語言文章，建議使用同一個 slug 目錄，不同語言使用不同檔案：

```text
content/posts/vscode-remote-codex-dev-efficiency/index.zh-CN.md
content/posts/vscode-remote-codex-dev-efficiency/index.zh-TW.md
content/posts/vscode-remote-codex-dev-efficiency/index.en.md
```

三份檔案使用相同的 `translationKey`：

```yaml
translationKey: "vscode-remote-codex-dev-efficiency"
```

這樣後續做語言切換、站內索引、RSS、sitemap 或 llms 檔案時，更容易把不同語言識別為同一篇文章的不同版本。

## 遠端建置檢查

文章或程式碼修改完成後，在遠端終端機執行：

```bash
npm run build
npm run check
```

如果 PowerShell 本機執行策略影響 `npm.ps1`，遠端 Linux 終端機通常不會遇到這個問題。但如果你是在 Windows 本機專案中執行，可以使用：

```powershell
npm.cmd run build
npm.cmd run check
```

對於部落格專案，建議把建置檢查作為每次提交前的固定動作，而不是部署失敗後再排查。

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

分支模式更適合讓 Codex 參與較大範圍修改，因為可以先透過 Pull Request 查看 diff，再合併到主分支。

## 適合交給 Codex 的任務

Codex 更適合做結構清楚、驗證路徑明確的任務，例如：

- 根據既有模板新增文章；
- 把簡體中文轉換為繁體中文和英文版本；
- 檢查 Markdown frontmatter 欄位；
- 總結最近一次 diff；
- 為提交產生 commit message；
- 排查建置錯誤；
- 補充專案說明文件或部署文件；
- 對小範圍腳本做重構。

不建議一開始就讓 Codex 改動過大的範圍，例如同時修改建置系統、部署腳本、站點主題與文章內容。大任務應該拆成多個小任務，每個任務都能獨立驗證。

## 一個可重複使用的提示詞

下面這個提示詞適合遠端專案中新增多語言部落格文章：

```text
你正在 /home/deploy/projects/blog.js.gripe 工作區。
請讀取專案說明文件和 content/posts 的現有結構。
目標：新增一篇關於 {主題} 的文章。
要求：
1. 路徑為 content/posts/{slug}/index.zh-CN.md、index.zh-TW.md、index.en.md；
2. 三個語言版本使用相同 translationKey；
3. frontmatter 必須包含 title、description、date、updated、translationKey、tags、category、draft、cover；
4. draft 設定為 false；
5. 完成後執行 npm run build 和 npm run check；
6. 不要修改 src、package.json、wrangler.toml。
```

這個提示詞把任務範圍、檔案結構、frontmatter、驗證命令與禁止修改項都寫清楚了，更適合讓 Codex 執行。

## 安全注意事項

遠端主機一旦和 AI 工具、Git 倉庫、部署腳本綁定，就要更注意權限：

- 不要把 `.env`、API Key、Cloudflare Token、Webhook Secret 寫進文章或提交到倉庫；
- 如果需要讓 Codex 讀取設定，優先給示例檔案，例如 `.env.example`；
- 對能執行命令的模式保持審慎，先看計畫，再授權執行；
- 大範圍改動使用 Git 分支和 Pull Request；
- 對部署鉤子、私鑰、Token 一律視為敏感資訊。

## 小結

VS Code Remote SSH 解決的是「在哪裡開發」的問題，Codex 解決的是「如何更快理解、修改和驗證專案」的問題。兩者結合後，遠端主機就能變成一個穩定、可復現、可協作的開發工作台。

對於 `blog.js.gripe`，可以把這個工作流固定為：遠端開啟專案、讓 Codex 產生或審查內容、執行建置檢查、透過 Git 合併和部署。這樣既能提升寫作和開發效率，也能控制誤改和部署風險。

## 參考

- Codex IDE 擴充套件文件：<https://developers.openai.com/codex/ide>
- Codex CLI 文件：<https://developers.openai.com/codex/cli>
- VS Code Remote SSH 文件：<https://code.visualstudio.com/docs/remote/ssh>
