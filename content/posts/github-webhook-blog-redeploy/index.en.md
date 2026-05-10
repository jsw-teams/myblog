---
title: "Using GitHub Webhooks to Monitor Project Changes and Redeploy a Blog"
description: "Build a safer automated redeployment flow for a static blog using GitHub Webhooks, signature verification, and Cloudflare Pages Deploy Hooks."
date: "2026-05-10"
updated: "2026-05-10"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "Automation"]
category: "Deployment Automation"
draft: false
cover: ""
---

Static blog deployment can often rely on a Git provider integration: push to the main branch, then build automatically. However, when you need finer control over trigger conditions, change logs, Telegram notifications, path filtering, or integrations with other systems, GitHub Webhooks provide a more flexible entry point.

This article describes an automation pattern for `blog.js.gripe`: GitHub monitors repository changes and sends a webhook to your own receiver; the receiver verifies the signature and then triggers a Cloudflare Pages Deploy Hook to redeploy the blog.

## Why not expose the Cloudflare Deploy Hook directly

A Cloudflare Pages Deploy Hook is essentially a URL that can trigger a deployment. If someone obtains the URL, they may be able to trigger deployments.

A safer architecture is:

```text
GitHub Webhook
      ↓
Your webhook receiver, such as Cloudflare Worker / API Gateway
      ↓ verify GitHub signature
Check event type, branch, and changed paths
      ↓
Call Cloudflare Pages Deploy Hook
      ↓
Rebuild blog.js.gripe
```

This keeps signature verification, path filtering, logging, and notification logic inside your own receiver.

## Choosing webhook events

For blog redeployment, the `push` event is usually enough. The trigger can be narrowed further:

```text
Event type: push
Branch: refs/heads/main
Paths: content/posts/**, content/pages/**, src/**, static/**
```

If you only want new article changes to trigger deployment, watch:

```text
content/posts/**
content/pages/**
```

If site themes, components, or build configuration can affect the output, include:

```text
src/**
astro.config.mjs
package.json
package-lock.json
wrangler.toml
```

## GitHub Webhook configuration

In the GitHub repository, go to:

```text
Settings → Webhooks → Add webhook
```

Recommended settings:

```text
Payload URL: your receiver URL, such as https://gateway.js.gripe/github/webhook
Content type: application/json
Secret: a strong random string
Events: Just the push event
Active: enabled
```

Do not commit the secret to the repository and do not place it in frontend code. Store it in server-side environment variables, for example:

```text
GITHUB_WEBHOOK_SECRET
CLOUDFLARE_DEPLOY_HOOK_URL
```

## Verify the GitHub signature

When a secret is configured, GitHub sends the `X-Hub-Signature-256` header. The receiver should calculate an HMAC-SHA256 digest using the raw request body and the secret, then compare it to the header using a constant-time comparison.

Here is a Cloudflare Worker-style example:

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

The key rule is to verify against the raw body. Do not `JSON.parse()` first and then stringify the payload again.

## Check branch and event type

After the signature passes, parse the JSON:

```ts
const payload = JSON.parse(new TextDecoder().decode(rawBody));
```

Only accept pushes to the main branch:

```ts
if (payload.ref !== "refs/heads/main") {
  return new Response("ignored: not main", { status: 202 });
}
```

Only accept GitHub push events:

```ts
const event = request.headers.get("X-GitHub-Event");
if (event !== "push") {
  return new Response("ignored: not push", { status: 202 });
}
```

This avoids accidental deployments from `pull_request`, `ping`, or other events.

## Filter changed file paths

To avoid unnecessary builds, read `added`, `modified`, and `removed` files from the commits:

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

Path filtering reduces unnecessary builds and makes deployment records easier to reason about.

## Trigger the Cloudflare Pages Deploy Hook

After event, branch, signature, and path checks pass, call the Cloudflare Deploy Hook:

```ts
const deployResp = await fetch(env.CLOUDFLARE_DEPLOY_HOOK_URL, {
  method: "POST",
});

if (!deployResp.ok) {
  return new Response("deploy hook failed", { status: 502 });
}

return new Response("deployment triggered", { status: 202 });
```

The Deploy Hook URL should be stored as an environment variable, not hardcoded.

## Full flow

The final flow is:

```text
1. GitHub receives a push to main
2. GitHub sends a webhook to gateway.js.gripe/github/webhook
3. Worker/API Gateway reads the raw body
4. Verify X-Hub-Signature-256
5. Check whether the event is push
6. Check whether ref is refs/heads/main
7. Check whether changed files affect blog output
8. Call the Cloudflare Pages Deploy Hook
9. Log the result and optionally send a Telegram notification
```

If you are already planning `gateway.js.gripe` and Telegram bots, this receiver can later be extended to:

- send deployment-start notifications;
- include the actor and commit message;
- report build failures;
- provide recent deployment records to an ops-panel;
- maintain separate webhook secrets and deploy hooks per project.

## Security recommendations

Automated deployment webhooks are high-privilege entry points. Pay attention to:

- using a strong random GitHub Webhook secret;
- never exposing the Deploy Hook URL in frontend code, articles, or public repositories;
- always verifying `X-Hub-Signature-256`;
- accepting only required event types;
- allowing only the main branch or selected branches;
- rate-limiting frequent triggers;
- logging request ID, event type, branch, commit, and deployment result;
- never logging full secrets, tokens, or Deploy Hook URLs.

## Local verification idea

Before deploying the receiver, you can send a basic test request:

```bash
curl -X POST https://gateway.js.gripe/github/webhook \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main","commits":[]}'
```

In a real signature-verification flow, this plain curl request should fail because it does not include a valid `X-Hub-Signature-256`. That is the expected security behavior. A temporary test mode can be useful during development, but production must not bypass signature verification.

## Summary

GitHub Webhooks are not only for "deploy after push." They provide a programmable entry point for repository changes. For `blog.js.gripe`, the recommended approach is to route the webhook to your own API Gateway or Cloudflare Worker: verify the signature, check the event, branch, and changed paths, then trigger the Cloudflare Pages Deploy Hook.

This enables real-time deployment while preparing the foundation for Telegram notifications, ops-panel audit trails, project status dashboards, and multi-project automation.

## References

- GitHub Webhook signature verification: <https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook events and payloads: <https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- Cloudflare Pages Deploy Hooks: <https://developers.cloudflare.com/pages/configuration/deploy-hooks/>
