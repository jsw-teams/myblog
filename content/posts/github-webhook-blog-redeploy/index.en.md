---
title: "Using GitHub Webhooks to Monitor Project Changes and Redeploy the Site"
description: "Use /opt/deploy-hooks on a VPS, GitHub Webhook signature verification, and OpenResty proxying so myweb and myblog pushes trigger a two-project redeployment."
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "Automation"]
category: "Technical Practice"
draft: false
cover: ""
---

A static site deployed on a VPS can react to GitHub changes much like a managed deployment platform. GitHub notifies the VPS after a push, the VPS verifies the signature, returns `202 Accepted` quickly, and then pulls, builds, syncs, and reloads OpenResty in the background.

This article documents the real `/opt/deploy-hooks` setup: a push to either the `myweb` or `myblog` main branch redeploys both projects.

## Goal

The public webhook endpoints are:

```text
myweb:  https://gateway.js.gripe/api/v1/gh/myweb
myblog: https://gateway.js.gripe/api/v1/gh/myblog
```

Both endpoints run the same orchestration script:

```text
jsw-teams/myweb  main -> /opt/deploy-hooks/bin/deploy-both.sh
jsw-teams/myblog main -> /opt/deploy-hooks/bin/deploy-both.sh
```

So any `myweb` or `myblog` change rebuilds both `myblog` and `myweb`. That keeps the main site's writing page, the blog feed, navigation, and static output aligned with the same deployment run.

## VPS Layout

The key files under `/opt/deploy-hooks` are:

```text
/opt/deploy-hooks/server.mjs
/opt/deploy-hooks/config/config.json
/opt/deploy-hooks/bin/deploy-both.sh
/opt/deploy-hooks/bin/deploy-myweb.sh
/opt/deploy-hooks/bin/deploy-myblog.sh
/opt/deploy-hooks/systemd/deploy-hooks.service
```

`server.mjs` receives GitHub Webhooks, reads the raw body, verifies `X-Hub-Signature-256`, checks the event and repository branch, then starts the configured deployment command in the background.

The important `config/config.json` mapping is:

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

The real config also contains `host`, `port`, and `secret`. Keep the `secret` only on the server and use the same value in GitHub. `myweb` and `myblog` should share the same secret, and old duplicate endpoints can be disabled or deleted.

## GitHub Webhook Settings

For `jsw-teams/myweb`, go to:

```text
Settings -> Webhooks -> Add webhook
```

Use:

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myweb
Content type: application/json
Secret: same value as /opt/deploy-hooks/config/config.json
Events: Just the push event
Active: enabled
```

For `jsw-teams/myblog`, use:

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myblog
Content type: application/json
Secret: same value as /opt/deploy-hooks/config/config.json
Events: Just the push event
Active: enabled
```

If an old myblog compatibility endpoint still exists, disable or delete it so one push does not start duplicate deployments.

## Handling GitHub Webhook Timeout

GitHub Webhook deliveries should not wait for the full deployment. One run can include `npm ci`, site builds, checks, static file sync, and OpenResty reload. If that exceeds GitHub's delivery wait time, GitHub may show:

```text
Last delivery was not successful. timed out.
```

The receiver should only acknowledge that the request was accepted:

```text
1. Read the raw body
2. Verify the GitHub signature
3. Confirm the event is push
4. Confirm repository and branch match
5. Return 202 Accepted immediately
6. Run deploy-both.sh in the background
```

GitHub only needs to know the VPS accepted the change. The build and reload continue in the background and write to logs.

## Maintenance Page During Deployment

When a static site deployment overwrites the served directory directly, users can briefly see 404s. This setup lets OpenResty take over temporarily:

```text
/opt/deploy-hooks/run/maintenance-myweb
/opt/deploy-hooks/run/maintenance-myblog
```

`deploy-both.sh` creates both marker files at the start and removes them at the end. When OpenResty sees a marker, it returns a temporary `503` page saying the content is being rebuilt and the visitor can refresh later.

That way, even while static files are being synced, visitors see a clear maintenance message instead of a missing page.

## OpenResty Configuration

`gateway.js.gripe` is exposed through OpenResty and proxied to the local Node service:

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

Only `/api/v1/gh/` is exposed publicly. The deployment scripts themselves are never exposed; public requests must pass signature verification in the Node service first.

Each site server also checks a maintenance marker:

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
    return 503 "...content is being rebuilt...";
}
```

`blog.js.gripe` uses the matching `maintenance-myblog` marker.

## Deployment Scripts

`deploy-both.sh` is the orchestrator:

```text
create myweb and myblog maintenance markers
run deploy-myblog.sh
run deploy-myweb.sh
remove maintenance markers
```

`deploy-myblog.sh` updates `/opt/myblog`:

```text
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
build into a temporary directory
sync public to /opt/myblog/public
npm run check
test and reload OpenResty
```

`deploy-myweb.sh` updates `/opt/myweb`:

```text
git fetch origin main
git reset --hard origin/main
npm ci --ignore-scripts
npm run build
build into a temporary directory
sync dist to /opt/myweb/dist
inject privacy analytics token
test and reload OpenResty
```

The scripts use lock files to avoid overlapping deployments. Builds happen in temporary directories first and are synced to the served directories only after success. Together with the OpenResty maintenance page, this reduces the 404 window during deployment.

## Logs and Debugging

Server request log:

```bash
/opt/deploy-hooks/logs/server.log
```

Deployment logs:

```bash
/opt/deploy-hooks/logs/both.log
/opt/deploy-hooks/logs/myweb.log
/opt/deploy-hooks/logs/myblog.log
```

If GitHub shows a timeout, check:

```bash
tail -n 80 /opt/deploy-hooks/logs/server.log
tail -n 80 /opt/deploy-hooks/logs/both.log
tail -n 80 /usr/local/openresty/nginx/logs/gateway.error.log
```

If `server.log` contains `deploy-accepted`, the VPS received the GitHub delivery and the remaining work is in the deployment logs. If GitHub times out but `server.log` has no entry, the request probably did not reach the Node service; check OpenResty, Cloudflare, or the systemd service.

## Full Flow

The final flow is:

```text
1. myweb or myblog is pushed to main
2. GitHub sends a webhook to /api/v1/gh/{hookId}
3. OpenResty proxies the request to 127.0.0.1:9000
4. /opt/deploy-hooks/server.mjs verifies signature, event, repository, and branch
5. The server returns 202 Accepted quickly to avoid GitHub delivery timeout
6. The VPS runs deploy-both.sh in the background
7. OpenResty temporarily shows the maintenance page
8. The scripts build myblog and myweb, then sync successful output
9. Maintenance markers are removed, config is tested, and OpenResty reloads
10. Logs are written under /opt/deploy-hooks/logs/
```

This gives the VPS a real-time way to react to GitHub repository changes and apply them locally.

## Security Notes

Deployment webhooks are high-privilege entry points:

- use a strong GitHub Webhook secret;
- always verify `X-Hub-Signature-256`;
- accept only `push` events;
- allow only `refs/heads/main` or selected branches;
- bind each hookId to a fixed repository;
- never log full secrets, tokens, or private keys;
- disable or delete old endpoints when they are no longer used;
- use deployment locks to avoid overlapping builds.

## Summary

`/opt/deploy-hooks` lets the VPS react to GitHub repository changes. `myweb` pushes call `https://gateway.js.gripe/api/v1/gh/myweb`; `myblog` pushes call `https://gateway.js.gripe/api/v1/gh/myblog`. A change in either project redeploys both projects. After signature verification, the VPS immediately returns `202`, deploys in the background, and OpenResty shows a maintenance page during the deployment window.

## References

- GitHub Webhook signature verification: <https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook events and payloads: <https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- OpenResty documentation: <https://openresty.org/en/>
