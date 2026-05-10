---
title: "使用 GitHub Webhook 实时监测项目变更，并触发博客重新部署"
description: "基于 GitHub Webhook、签名校验和 Cloudflare Pages Deploy Hook，构建一个更安全的博客自动重部署流程。"
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "自动化"]
category: "部署自动化"
draft: false
cover: ""
---

静态博客的部署通常可以直接依赖 Git 平台集成：推送到主分支后自动构建。但当我们希望更精细地控制触发条件、记录变更、接入 Telegram 通知、过滤路径或联动其他系统时，GitHub Webhook 会更灵活。

这篇文章记录一种适合 `blog.js.gripe` 的自动化思路：GitHub 监测仓库变更，发送 Webhook 到自己的接收端；接收端校验签名后，再触发 Cloudflare Pages Deploy Hook 重新部署博客。

## 为什么不直接暴露 Cloudflare Deploy Hook

Cloudflare Pages Deploy Hook 本质上是一个可以触发部署的 URL。只要有人拿到这个 URL，就可能发起部署请求。因此不建议把 Cloudflare Deploy Hook 直接作为 GitHub Webhook 地址公开使用。

更推荐的结构是：

```text
GitHub Webhook
      ↓
自己的 Webhook 接收端，例如 Cloudflare Worker / API Gateway
      ↓ 校验 GitHub 签名
判断事件类型、分支、路径
      ↓
调用 Cloudflare Pages Deploy Hook
      ↓
重新构建 blog.js.gripe
```

这样可以把安全校验、路径过滤、日志记录和通知逻辑都放在自己的接收端中。

## Webhook 事件选择

对于博客自动部署，通常只需要监听 `push` 事件。触发条件可以进一步收紧：

```text
事件类型：push
分支：refs/heads/main
路径：content/posts/**、content/pages/**、src/**、static/**
```

如果只是新增文章，可以只关注：

```text
content/posts/**
content/pages/**
```

如果站点主题、组件或构建配置也会影响输出，则需要加入：

```text
src/**
astro.config.mjs
package.json
package-lock.json
wrangler.toml
```

## GitHub Webhook 配置

在 GitHub 仓库中进入：

```text
Settings → Webhooks → Add webhook
```

建议配置：

```text
Payload URL：你的接收端地址，例如 https://gateway.js.gripe/github/webhook
Content type：application/json
Secret：一段高强度随机字符串
Events：Just the push event
Active：启用
```

Secret 不要写进仓库，也不要写进前端代码。应该存放在服务端环境变量中，例如：

```text
GITHUB_WEBHOOK_SECRET
CLOUDFLARE_DEPLOY_HOOK_URL
```

## 校验 GitHub 签名

GitHub 在配置 Secret 后，会给请求附带 `X-Hub-Signature-256`。接收端应该使用原始请求体和 Secret 计算 HMAC-SHA256，并和这个 header 做常量时间比较。

下面是一个 Cloudflare Worker 风格的示例：

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

关键点是：一定要用原始 body 参与签名计算，不要先 `JSON.parse()` 再重新 stringify。

## 判断分支和事件

签名通过后，再解析 JSON：

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

这样可以避免 pull_request、ping 或其他事件误触发部署。

## 过滤文件路径

为了避免无关变更触发部署，可以读取 commits 中的 `added`、`modified`、`removed`：

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

路径过滤能减少不必要的构建，也能让部署记录更清晰。

## 触发 Cloudflare Pages Deploy Hook

当事件、分支、签名和路径都通过后，再调用 Cloudflare Deploy Hook：

```ts
const deployResp = await fetch(env.CLOUDFLARE_DEPLOY_HOOK_URL, {
  method: "POST",
});

if (!deployResp.ok) {
  return new Response("deploy hook failed", { status: 502 });
}

return new Response("deployment triggered", { status: 202 });
```

Deploy Hook URL 应该作为环境变量保存，不要直接写在代码中。

## 完整流程

最终流程可以整理为：

```text
1. GitHub push 到 main
2. GitHub 向 gateway.js.gripe/github/webhook 发送 Webhook
3. Worker/API Gateway 读取原始 body
4. 校验 X-Hub-Signature-256
5. 判断事件是否为 push
6. 判断 ref 是否为 refs/heads/main
7. 判断 changed files 是否影响博客输出
8. 调用 Cloudflare Pages Deploy Hook
9. 记录日志，并可选发送 Telegram 通知
```

如果你已经在规划 `gateway.js.gripe` 和 Telegram Bot，这个接收端也可以继续扩展：

- 推送部署开始通知；
- 推送部署触发人和 commit message；
- 推送构建失败提示；
- 给 ops-panel 提供最近部署记录；
- 按项目维护不同 Webhook Secret 和 Deploy Hook。

## 安全建议

Webhook 自动部署属于高权限入口，需要重点注意：

- GitHub Webhook Secret 必须足够随机；
- Deploy Hook URL 不要暴露到前端、文章或公开仓库；
- 必须验证 `X-Hub-Signature-256`；
- 只接受需要的事件类型；
- 只允许主分支或指定分支触发；
- 对频繁触发做限流；
- 记录请求 ID、事件类型、分支、commit 和部署结果；
- 不要在日志里输出完整 Secret、Token 或 Deploy Hook URL。

## 本地验证思路

部署前可以先本地模拟：

```bash
curl -X POST https://gateway.js.gripe/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","commits":[]}'
```

真实签名校验场景下，普通 curl 不会通过，因为缺少正确的 `X-Hub-Signature-256`。这正是安全校验应该产生的效果。开发阶段可以临时增加测试模式，但不要在生产环境绕过签名校验。

## 小结

GitHub Webhook 的意义不只是“推送后自动部署”，而是给项目变更提供一个可编排入口。对于 `blog.js.gripe`，推荐把 Webhook 接到自己的 API Gateway 或 Cloudflare Worker：先校验签名，再判断事件、分支和路径，最后触发 Cloudflare Pages Deploy Hook。

这样既能实现实时部署，也能为后续接入 Telegram 通知、ops-panel 审计、项目状态看板和多项目自动化打下基础。

## 参考

- GitHub Webhook 签名校验：<https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook 事件与 payload：<https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- Cloudflare Pages Deploy Hooks：<https://developers.cloudflare.com/pages/configuration/deploy-hooks/>
