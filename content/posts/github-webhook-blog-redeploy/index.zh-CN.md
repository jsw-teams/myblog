---
title: "使用 GitHub Webhook 实时监测项目变更，并触发博客重新部署"
description: "基于 VPS 上的 /opt/deploy-hooks、GitHub Webhook 签名校验和 OpenResty 反代，让 myweb 与 myblog 的 main 分支变更自动触发双项目重新部署。"
date: "2026-05-10"
updated: "2026-06-02"
translationKey: "github-webhook-blog-redeploy"
tags: ["GitHub", "Webhook", "自动化"]
category: "技术实践"
draft: false
cover: ""
---

静态站点部署在 VPS 上时，也可以像平台部署一样实时感知 GitHub 变更。GitHub 在仓库 push 后通知 VPS，VPS 校验签名、快速返回 `202 Accepted`，然后在后台拉取代码、构建产物并 reload OpenResty。

这篇文章记录的是 `/opt/deploy-hooks` 的实际方案：`myweb` 和 `myblog` 两个项目的 main 分支任意一方发生 push 后，都会统一触发两个项目的重新部署。

## 目标

当前保留两个公开 Webhook 入口：

```text
myweb:  https://gateway.js.gripe/api/v1/gh/myweb
myblog: https://gateway.js.gripe/api/v1/gh/myblog
```

两个入口最终都进入同一个总控脚本：

```text
jsw-teams/myweb  main -> /opt/deploy-hooks/bin/deploy-both.sh
jsw-teams/myblog main -> /opt/deploy-hooks/bin/deploy-both.sh
```

也就是说，`myweb` 或 `myblog` 任意一方变更，都会重新构建 `myblog` 和 `myweb`。这样主站写作页、博客文章列表、导航和静态产物会来自同一轮部署结果。

## VPS 侧结构

`/opt/deploy-hooks` 的核心文件如下：

```text
/opt/deploy-hooks/server.mjs
/opt/deploy-hooks/config/config.json
/opt/deploy-hooks/bin/deploy-both.sh
/opt/deploy-hooks/bin/deploy-myweb.sh
/opt/deploy-hooks/bin/deploy-myblog.sh
/opt/deploy-hooks/systemd/deploy-hooks.service
```

`server.mjs` 负责接收 GitHub Webhook、读取原始 body、校验 `X-Hub-Signature-256`、判断事件和仓库分支，然后在后台启动配置中对应的部署命令。

`config/config.json` 的关键映射是：

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

真实配置还会包含 `host`、`port` 和 `secret`。`secret` 只保存在服务器上，并和 GitHub Webhook 中填写的值保持一致。`myweb` 和 `myblog` 建议使用同一份密钥，旧的重复入口可以禁用或删除。

## GitHub Webhook 配置

在 `jsw-teams/myweb` 仓库中进入：

```text
Settings -> Webhooks -> Add webhook
```

填写：

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myweb
Content type: application/json
Secret: 与 /opt/deploy-hooks/config/config.json 中 secret 一致
Events: Just the push event
Active: enabled
```

在 `jsw-teams/myblog` 仓库中使用：

```text
Payload URL: https://gateway.js.gripe/api/v1/gh/myblog
Content type: application/json
Secret: 与 /opt/deploy-hooks/config/config.json 中 secret 一致
Events: Just the push event
Active: enabled
```

旧的 myblog 兼容入口如果存在，应该禁用或删除，避免同一次 push 重复触发部署。

## 处理 GitHub Webhook timeout

GitHub Webhook 的请求不适合一直等待完整部署结束。一次部署可能包含 `npm ci`、站点 build、检查、静态文件同步和 OpenResty reload，耗时超过 GitHub 等待时间后，页面就会出现：

```text
Last delivery was not successful. timed out.
```

解决方式是让 Webhook 接收端只负责确认请求已经被接受：

```text
1. 读取原始 body
2. 校验 GitHub 签名
3. 确认事件是 push
4. 确认仓库和分支匹配
5. 立即返回 202 Accepted
6. 后台异步运行 deploy-both.sh
```

GitHub 只需要知道 VPS 已经收到这次变更；真正的构建和 reload 在 VPS 后台继续执行，结果写入日志。

## 部署期间的维护页

静态站点部署时，如果直接覆盖对外目录，用户可能会在短时间内看到 404。这里让 OpenResty 临时接管：

```text
/opt/deploy-hooks/run/maintenance-myweb
/opt/deploy-hooks/run/maintenance-myblog
```

`deploy-both.sh` 开始时创建这两个标记文件，部署结束时删除。OpenResty 检测到标记后返回临时 `503` 页面，提示内容正在重构、稍后刷新即可。

这样部署过程中即使静态目录正在同步，用户看到的也是明确的维护提示，而不是误以为页面丢失。

## OpenResty 配置

`gateway.js.gripe` 由 OpenResty 接入公网，再反代到本机 Node 服务：

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

这里的重点是公网只开放 `/api/v1/gh/`，真正的部署脚本不直接暴露。请求必须先经过 Node 服务的签名校验。

站点自身的 server 配置会检查维护标记：

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
    return 503 "...内容正在重构...";
}
```

`blog.js.gripe` 使用对应的 `maintenance-myblog` 标记。

## 部署脚本

`deploy-both.sh` 是总控入口：

```text
创建 myweb 和 myblog 维护标记
运行 deploy-myblog.sh
运行 deploy-myweb.sh
清理维护标记
```

`deploy-myblog.sh` 更新 `/opt/myblog`：

```text
git fetch origin main
git reset --hard origin/main
npm ci
npm run build
生成到临时目录
同步 public 到 /opt/myblog/public
npm run check
测试并 reload OpenResty
```

`deploy-myweb.sh` 更新 `/opt/myweb`：

```text
git fetch origin main
git reset --hard origin/main
npm ci --ignore-scripts
npm run build
生成到临时目录
同步 dist 到 /opt/myweb/dist
注入 privacy analytics token
测试并 reload OpenResty
```

脚本使用 lock file，避免并发部署互相踩踏。构建先发生在临时目录，成功后再同步到对外服务目录，配合 OpenResty 维护页，可以减少部署过程中的 404 窗口。

## 日志与排查

服务端请求日志：

```bash
/opt/deploy-hooks/logs/server.log
```

项目部署日志：

```bash
/opt/deploy-hooks/logs/both.log
/opt/deploy-hooks/logs/myweb.log
/opt/deploy-hooks/logs/myblog.log
```

如果 GitHub 显示 timeout，优先检查：

```bash
tail -n 80 /opt/deploy-hooks/logs/server.log
tail -n 80 /opt/deploy-hooks/logs/both.log
tail -n 80 /usr/local/openresty/nginx/logs/gateway.error.log
```

如果 `server.log` 里已经出现 `deploy-accepted`，说明 GitHub 请求已经被 VPS 接收，后续要看部署日志。如果 GitHub timeout 但 `server.log` 没记录，说明请求可能没有到 Node 服务，需要检查 OpenResty、Cloudflare 或 systemd 服务状态。

## 完整流程

最终流程可以整理为：

```text
1. myweb 或 myblog push 到 main
2. GitHub 向对应 /api/v1/gh/{hookId} 发送 Webhook
3. OpenResty 将请求反代到 127.0.0.1:9000
4. /opt/deploy-hooks/server.mjs 校验签名、事件、仓库和分支
5. 服务端快速返回 202 Accepted，避免 GitHub delivery timeout
6. VPS 后台运行 deploy-both.sh
7. OpenResty 临时显示维护页
8. 脚本依次构建 myblog 和 myweb，并同步成功产物
9. 清理维护标记、测试并 reload OpenResty
10. 日志写入 /opt/deploy-hooks/logs/
```

这样，VPS 就能实时感知 GitHub 项目变更，并在自己的服务器上应用变更。

## 安全建议

Webhook 自动部署属于高权限入口，需要重点注意：

- GitHub Webhook Secret 必须足够随机；
- 必须验证 `X-Hub-Signature-256`；
- 只接受 `push` 事件；
- 只允许 `refs/heads/main` 或指定分支触发；
- 每个 hookId 绑定固定仓库，不能只靠 URL 名称判断；
- 不要在日志中输出完整 Secret、Token 或私钥；
- 旧 endpoint 不再使用时应禁用或删除；
- 部署脚本需要 lock，避免并发构建互相覆盖。

## 小结

`/opt/deploy-hooks` 的意义是让 VPS 具备实时感知 GitHub 仓库变更的能力。`myweb` 变更请求 `https://gateway.js.gripe/api/v1/gh/myweb`，`myblog` 变更请求 `https://gateway.js.gripe/api/v1/gh/myblog`。任意一方变更都会统一重建两个项目；VPS 校验签名后立即返回 202，再在后台部署，并由 OpenResty 在部署期间显示维护页。

## 参考

- GitHub Webhook 签名校验：<https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries>
- GitHub Webhook 事件与 payload：<https://docs.github.com/en/webhooks/webhook-events-and-payloads>
- OpenResty 文档：<https://openresty.org/en/>
