---
title: "使用 GitHub Webhook 即時監測專案變更，並觸發網站重新部署"
description: "基於 VPS 上的 /opt/deploy-hooks、GitHub Webhook 簽名校驗與 OpenResty 反代，讓 myweb 與 myblog 的 main 分支變更自動觸發雙專案重新部署。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "自動化"]
category: "技術實作"
draft: false
cover: ""
---

部署在 VPS 上的靜態站點，也可以像平台部署一樣即時感知 GitHub 變更。GitHub 在倉庫 push 後通知 VPS，VPS 校驗簽名、快速返回 `202 Accepted`，然後在後台拉取程式碼、建置產物並 reload OpenResty。

這篇文章記錄的是 `/opt/deploy-hooks` 的實際方案：`myweb` 和 `myblog` 兩個專案的 main 分支任意一方發生 push 後，都會統一觸發兩個專案的重新部署。

## 目標

目前保留兩個公開 Webhook 入口：

```text
myweb:  https://gateway.js.gripe/api/v1/gh/myweb
myblog: https://gateway.js.gripe/api/v1/gh/myblog
```

兩個入口最終都進入同一個總控腳本：

```text
jsw-teams/myweb  main -> /opt/deploy-hooks/bin/deploy-both.sh
jsw-teams/myblog main -> /opt/deploy-hooks/bin/deploy-both.sh
```

也就是說，`myweb` 或 `myblog` 任意一方變更，都會重新建置 `myblog` 和 `myweb`。這樣主站寫作頁、部落格文章列表、導航和靜態產物會來自同一輪部署結果。

## VPS 側結構

`/opt/deploy-hooks` 的核心檔案如下：

```text
/opt/deploy-hooks/server.mjs
/opt/deploy-hooks/config/config.json
/opt/deploy-hooks/bin/deploy-both.sh
/opt/deploy-hooks/bin/deploy-myweb.sh
/opt/deploy-hooks/bin/deploy-myblog.sh
/opt/deploy-hooks/systemd/deploy-hooks.service
```

`server.mjs` 負責接收 GitHub Webhook、讀取原始 body、校驗 `X-Hub-Signature-256`、判斷事件和倉庫分支，然後在後台啟動設定中對應的部署命令。

`config/config.json` 的關鍵映射是：

```json
{
  "hooks": {
    "myweb": {
      "repository": "jsw-teams/myweb",
      "branch": "refs/heads/main",
      "command": "/opt/deploy-hooks/bin/deploy-both.sh"
    },
    "myblog": {
      "repository": "jsw-teams/myblog",
      "branch": "refs/heads/main",
      "command": "/opt/deploy-hooks/bin/deploy-both.sh"
    }
  }
}
```

真實設定還會包含 `host`、`port` 和 `secret`。`secret` 只保存在伺服器上，並和 GitHub Webhook 中填寫的值保持一致。`myweb` 和 `myblog` 建議使用同一份密鑰，舊的重複入口可以禁用或刪除。

## GitHub Webhook 設定

在 `jsw-teams/myweb` 倉庫中進入：

```text
Settings -> Webhooks -> Add webhook
```

填寫：

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myweb
Content type: application/json
Secret: 與 /opt/deploy-hooks/config/config.json 中 secret 一致
Events: Just the push event
Active: enabled
```

在 `jsw-teams/myblog` 倉庫中使用：

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myblog
Content type: application/json
Secret: 與 /opt/deploy-hooks/config/config.json 中 secret 一致
Events: Just the push event
Active: enabled
```

舊的 myblog 相容入口如果存在，應該禁用或刪除，避免同一次 push 重複觸發部署。

## 處理 GitHub Webhook timeout

GitHub Webhook 的請求不適合一直等待完整部署結束。一次部署可能包含 `npm ci`、站點 build、檢查、靜態檔案同步和 OpenResty reload，耗時超過 GitHub 等待時間後，頁面就會出現：

```text
Last delivery was not successful. timed out.
```

解決方式是讓 Webhook 接收端只負責確認請求已經被接受：

```text
1. 讀取原始 body
2. 校驗 GitHub 簽名
3. 確認事件是 push
4. 確認倉庫和分支匹配
5. 立即返回 202 Accepted
6. 後台非同步執行 deploy-both.sh
```

GitHub 只需要知道 VPS 已經收到這次變更；真正的建置和 reload 在 VPS 後台繼續執行，結果寫入日誌。

## 部署期間的維護頁

靜態站點部署時，如果直接覆蓋對外目錄，使用者可能會在短時間內看到 404。這裡讓 OpenResty 臨時接管：

```text
/opt/deploy-hooks/run/maintenance-myweb
/opt/deploy-hooks/run/maintenance-myblog
```

`deploy-both.sh` 開始時建立這兩個標記檔案，部署結束時刪除。OpenResty 檢測到標記後返回臨時 `503` 頁面，提示內容正在重構、稍後重新整理即可。

這樣部署過程中即使靜態目錄正在同步，使用者看到的也是明確的維護提示，而不是誤以為頁面遺失。

## OpenResty 設定

`gateway.js.gripe` 由 OpenResty 接入公網，再反代到本機 Node 服務：

```nginx
upstream deploy_hooks_backend {
    server 127.0.0.1:9000;
    keepalive 8;
}

location = /api/v1/gh/healthz {
    proxy_pass http://deploy_hooks_backend;
}

location ^~ /api/v1/gh/ {
    client_max_body_size 1m;
    proxy_http_version 1.1;
    proxy_request_buffering on;
    proxy_buffering off;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Connection "";
    proxy_pass http://deploy_hooks_backend;
}
```

這裡的重點是公網只開放 `/api/v1/gh/`，真正的部署腳本不直接暴露。請求必須先經過 Node 服務的簽名校驗。

站點自身的 server 設定會檢查維護標記：

```nginx
error_page 503 @maintenance;

if (-f /opt/deploy-hooks/run/maintenance-myweb) {
    return 503;
}

location @maintenance {
    internal;
    default_type text/html;
    add_header Cache-Control "no-store" always;
    add_header Retry-After "120" always;
    return 503 "...內容正在重構...";
}
```

`blog.js.gripe` 使用對應的 `maintenance-myblog` 標記。

## 部署腳本

`deploy-both.sh` 是總控入口：

```text
建立 myweb 和 myblog 維護標記
執行 deploy-myblog.sh
執行 deploy-myweb.sh
清理維護標記
```

`deploy-myblog.sh` 更新 `/opt/myblog`：

```text
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
生成到臨時目錄
同步 public 到 /opt/myblog/public
npm run check
測試並 reload OpenResty
```

`deploy-myweb.sh` 更新 `/opt/myweb`：

```text
git fetch origin main
git reset --hard origin/main
npm ci --ignore-scripts
npm run build
生成到臨時目錄
同步 dist 到 /opt/myweb/dist
注入 privacy analytics token
測試並 reload OpenResty
```

腳本使用 lock file，避免並發部署互相踩踏。建置先發生在臨時目錄，成功後再同步到對外服務目錄，配合 OpenResty 維護頁，可以減少部署過程中的 404 視窗。

## 日誌與排查

服務端請求日誌：

```bash
/opt/deploy-hooks/logs/server.log
```

專案部署日誌：

```bash
/opt/deploy-hooks/logs/both.log
/opt/deploy-hooks/logs/myweb.log
/opt/deploy-hooks/logs/myblog.log
```

如果 GitHub 顯示 timeout，優先檢查：

```bash
tail -n 80 /opt/deploy-hooks/logs/server.log
tail -n 80 /opt/deploy-hooks/logs/both.log
tail -n 80 /usr/local/openresty/nginx/logs/gateway.error.log
```

如果 `server.log` 裡已經出現 `deploy-accepted`，表示 GitHub 請求已經被 VPS 接收，後續要看部署日誌。如果 GitHub timeout 但 `server.log` 沒記錄，表示請求可能沒有到 Node 服務，需要檢查 OpenResty、Cloudflare 或 systemd 服務狀態。

## 完整流程

最終流程可以整理為：

```text
1. myweb 或 myblog push 到 main
2. GitHub 向對應 /api/v1/gh/{hookId} 傳送 Webhook
3. OpenResty 將請求反代到 127.0.0.1:9000
4. /opt/deploy-hooks/server.mjs 校驗簽名、事件、倉庫和分支
5. 服務端快速返回 202 Accepted，避免 GitHub delivery timeout
6. VPS 後台執行 deploy-both.sh
7. OpenResty 臨時顯示維護頁
8. 腳本依序建置 myblog 和 myweb，並同步成功產物
9. 清理維護標記、測試並 reload OpenResty
10. 日誌寫入 /opt/deploy-hooks/logs/
```

這樣，VPS 就能即時感知 GitHub 專案變更，並在自己的伺服器上套用變更。

## 安全建議

Webhook 自動部署屬於高權限入口，需要重點注意：

- GitHub Webhook Secret 必須足夠隨機；
- 必須驗證 `X-Hub-Signature-256`；
- 只接受 `push` 事件；
- 只允許 `refs/heads/main` 或指定分支觸發；
- 每個 hookId 綁定固定倉庫，不能只靠 URL 名稱判斷；
- 不要在日誌中輸出完整 Secret、Token 或私鑰；
- 舊 endpoint 不再使用時應禁用或刪除；
- 部署腳本需要 lock，避免並發建置互相覆蓋。

## 小結

`/opt/deploy-hooks` 的意義是讓 VPS 具備即時感知 GitHub 倉庫變更的能力。`myweb` 變更請求 `https://gateway.js.gripe/api/v1/gh/myweb`，`myblog` 變更請求 `https://gateway.js.gripe/api/v1/gh/myblog`。任意一方變更都會統一重建兩個專案；VPS 校驗簽名後立即返回 202，再在後台部署，並由 OpenResty 在部署期間顯示維護頁。

## 參考

- GitHub Webhook 簽名校驗：<https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook 事件與 payload：<https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- OpenResty 文件：<https://openresty.org/en/>
