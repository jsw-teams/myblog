---
title: "使用 GitHub Webhook 即時監測專案變更，並觸發部落格重新部署"
description: "基於 GitHub Webhook、簽名校驗與 Cloudflare Pages Deploy Hook，建構一個更安全的部落格自動重新部署流程。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "自動化"]
category: "部署自動化"
draft: false
cover: ""
---

靜態部落格的部署通常可以直接依賴 Git 平台整合：推送到主分支後自動建置。但當我們希望更精細地控制觸發條件、記錄變更、接入 Telegram 通知、過濾路徑或聯動其他系統時，GitHub Webhook 會更靈活。

這篇文章記錄一種適合 `blog.js.gripe` 的自動化思路：GitHub 監測倉庫變更，傳送 Webhook 到自己的接收端；接收端校驗簽名後，再觸發 Cloudflare Pages Deploy Hook 重新部署部落格。

## 為什麼不直接暴露 Cloudflare Deploy Hook

Cloudflare Pages Deploy Hook 本質上是一個可以觸發部署的 URL。只要有人拿到這個 URL，就可能發起部署請求。因此不建議把 Cloudflare Deploy Hook 直接作為 GitHub Webhook 位址公開使用。

更推薦的結構是：

```text
GitHub Webhook
      ↓
自己的 Webhook 接收端，例如 Cloudflare Worker / API Gateway
      ↓ 校驗 GitHub 簽名
判斷事件類型、分支、路徑
      ↓
呼叫 Cloudflare Pages Deploy Hook
      ↓
重新建置 blog.js.gripe
```

這樣可以把安全校驗、路徑過濾、日誌記錄與通知邏輯都放在自己的接收端中。

## Webhook 事件選擇

對於部落格自動部署，通常只需要監聽 `push` 事件。觸發條件可以進一步收緊：

```text
事件類型：push
分支：refs/heads/main
路徑：content/posts/**、content/pages/**、src/**、static/**
```

如果只是新增文章，可以只關注：

```text
content/posts/**
content/pages/**
```

如果站點主題、元件或建置設定也會影響輸出，則需要加入：

```text
src/**
astro.config.mjs
package.json
package-lock.json
wrangler.toml
```

## GitHub Webhook 設定

在 GitHub 倉庫中進入：

```text
Settings → Webhooks → Add webhook
```

建議設定：

```text
Payload URL：你的接收端位址，例如 https://gateway.js.gripe/github/webhook
Content type：application/json
Secret：一段高強度隨機字串
Events：Just the push event
Active：啟用
```

Secret 不要寫進倉庫，也不要寫進前端程式碼。應該存放在服務端環境變數中，例如：

```text
GITHUB_WEBHOOK_SECRET
CLOUDFLARE_DEPLOY_HOOK_URL
```

## 校驗 GitHub 簽名

GitHub 在設定 Secret 後，會給請求附帶 `X-Hub-Signature-256`。接收端應該使用原始請求體和 Secret 計算 HMAC-SHA256，並和這個 header 做常量時間比較。

下面是一個 Cloudflare Worker 風格的示例：

```ts
async function verifyGitHubSignature(
  request: Request,
  secret: string,
  rawBody: ArrayBuffer
): Promise<boolean> {
  const signature = request.headers.get("X-Hub-Signature-256") || "";
  if (!signature.startsWith("sha256=")) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const digest = await crypto.subtle.sign("HMAC", key, rawBody);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(signature, `sha256=${hex}`);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
```

關鍵點是：一定要用原始 body 參與簽名計算，不要先 `JSON.parse()` 再重新 stringify。

## 判斷分支和事件

簽名通過後，再解析 JSON：

```ts
const payload = JSON.parse(new TextDecoder().decode(rawBody));
```

只接受主分支 push：

```ts
if (payload.ref !== "refs/heads/main") {
  return new Response("ignored: not main", { status: 202 });
}
```

只接受 GitHub 的 push 事件：

```ts
const event = request.headers.get("X-GitHub-Event");
if (event !== "push") {
  return new Response("ignored: not push", { status: 202 });
}
```

這樣可以避免 pull_request、ping 或其他事件誤觸發部署。

## 過濾檔案路徑

為了避免無關變更觸發部署，可以讀取 commits 中的 `added`、`modified`、`removed`：

```ts
const changedFiles = payload.commits.flatMap((commit: any) => [
  ...(commit.added || []),
  ...(commit.modified || []),
  ...(commit.removed || []),
]);

const shouldDeploy = changedFiles.some((file: string) =>
  file.startsWith("content/posts/") ||
  file.startsWith("content/pages/") ||
  file.startsWith("src/") ||
  file === "astro.config.mjs" ||
  file === "package.json" ||
  file === "package-lock.json" ||
  file === "wrangler.toml"
);

if (!shouldDeploy) {
  return new Response("ignored: no deploy-related changes", { status: 202 });
}
```

路徑過濾能減少不必要的建置，也能讓部署記錄更清楚。

## 觸發 Cloudflare Pages Deploy Hook

當事件、分支、簽名與路徑都通過後，再呼叫 Cloudflare Deploy Hook：

```ts
const deployResp = await fetch(env.CLOUDFLARE_DEPLOY_HOOK_URL, {
  method: "POST",
});

if (!deployResp.ok) {
  return new Response("deploy hook failed", { status: 502 });
}

return new Response("deployment triggered", { status: 202 });
```

Deploy Hook URL 應該作為環境變數保存，不要直接寫在程式碼中。

## 完整流程

最終流程可以整理為：

```text
1. GitHub push 到 main
2. GitHub 向 gateway.js.gripe/github/webhook 傳送 Webhook
3. Worker/API Gateway 讀取原始 body
4. 校驗 X-Hub-Signature-256
5. 判斷事件是否為 push
6. 判斷 ref 是否為 refs/heads/main
7. 判斷 changed files 是否影響部落格輸出
8. 呼叫 Cloudflare Pages Deploy Hook
9. 記錄日誌，並可選傳送 Telegram 通知
```

如果你已經在規劃 `gateway.js.gripe` 和 Telegram Bot，這個接收端也可以繼續擴展：

- 推送部署開始通知；
- 推送部署觸發人和 commit message；
- 推送建置失敗提示；
- 給 ops-panel 提供最近部署記錄；
- 按專案維護不同 Webhook Secret 和 Deploy Hook。

## 安全建議

Webhook 自動部署屬於高權限入口，需要重點注意：

- GitHub Webhook Secret 必須足夠隨機；
- Deploy Hook URL 不要暴露到前端、文章或公開倉庫；
- 必須驗證 `X-Hub-Signature-256`；
- 只接受需要的事件類型；
- 只允許主分支或指定分支觸發；
- 對頻繁觸發做限流；
- 記錄請求 ID、事件類型、分支、commit 和部署結果；
- 不要在日誌裡輸出完整 Secret、Token 或 Deploy Hook URL。

## 本機驗證思路

部署前可以先本機模擬：

```bash
curl -X POST https://gateway.js.gripe/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","commits":[]}'
```

真實簽名校驗場景下，普通 curl 不會通過，因為缺少正確的 `X-Hub-Signature-256`。這正是安全校驗應該產生的效果。開發階段可以臨時增加測試模式，但不要在生產環境繞過簽名校驗。

## 小結

GitHub Webhook 的意義不只是「推送後自動部署」，而是給專案變更提供一個可編排入口。對於 `blog.js.gripe`，推薦把 Webhook 接到自己的 API Gateway 或 Cloudflare Worker：先校驗簽名，再判斷事件、分支和路徑，最後觸發 Cloudflare Pages Deploy Hook。

這樣既能實現即時部署，也能為後續接入 Telegram 通知、ops-panel 稽核、專案狀態看板和多專案自動化打下基礎。

## 參考

- GitHub Webhook 簽名校驗：<https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook 事件與 payload：<https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- Cloudflare Pages Deploy Hooks：<https://developers.cloudflare.com/pages/configuration/deploy-hooks/>
