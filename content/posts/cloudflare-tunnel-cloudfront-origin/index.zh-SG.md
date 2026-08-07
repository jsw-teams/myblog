---
title: "不暴露源站公网 IP，如何接入 AWS CloudFront"
description: "一次用 Cloudflare Tunnel 为 AWS CloudFront 建立私有回源的工程复盘：从 Cloudflare SaaS 绑定踩坑，到统一 origin、CloudFront Function 与 OpenResty 多虚拟主机转发。"
date: "2026-06-23"
updated: "2026-06-23"
translationKey: "cloudflare-tunnel-cloudfront-origin"
tags: ["Cloudflare Tunnel", "CloudFront", "OpenResty", "AWS", "回源"]
category: "技术实作"
draft: false
cover: "https://pictor.js.gripe/i/496527fc-d5c9-4b97-5aea-0bed8e8ac600/public.png"
---

这次迁移并不是一开始就决定使用 CloudFront + Cloudflare Tunnel。

最初的问题很具体：`js.gripe` 下面已经有多个 OpenResty 虚拟主机，像是 `blog.js.gripe`、`www.js.gripe`、`dquery.js.gripe`。它们各自有不同的静态资源、动态界面、缓存策略和凭证行为。原本的 Cloudflare 代理可以让站点跑起来，但当我开始研究 CloudFront 固定费率方案时，AWS 又重新进入候选。

真正让我重新尝试 CloudFront 的原因，是面向中国大陆用户时，AWS 的连通性看起来比 Cloudflare 更值得测试。原本的 Cloudflare 代理可用，但访问体验不一定稳定；如果 CloudFront 在这部分用户上表现更好，就值得把它放到前台验证。

CloudFront 以前让我犹豫的是账单模型。pay-as-you-go 下，请求、流量、WAF、日志、边缘函数都分开计费。小站平时可能很便宜，但遇到爬虫、DDoS、缓存命中率下降、动态界面突然变多时，账单不确定性会放大。最近看到 CloudFront flat-rate pricing plans 之后，尝试成本下降了：它把 CDN、WAF、DDoS 防护、DNS、TLS 凭证、日志、Serverless Edge Compute 等能力放进月度方案，并强调 no overage charges。于是用 CloudFront Functions 做 host 路由、缓存隔离、cookie 清理这些轻量逻辑，就不再只是“每次调用都要算帐”的心理负担。

真正绕了一圈的，是如何让 CloudFront 回源，同时不暴露源站 IP。

顺便也得吐槽一句：到现在 CloudFront 设 origin 仍然不能直接填 IP，必须填一个域名。这个限制在普通公网源站场景里只是有点麻烦，但放到“不暴露源站 IP”的目标下，就变成了架构约束：我们必须先准备一个不会泄漏真实源站地址的 origin hostname，再让这个 hostname 通过 Tunnel 回到本机。后面的 `aws-origin.js.gripe`、每域名中间 origin，以及统一 origin 方案，都是围绕这个限制展开的。

这次迁移的大部分排查和实际操作都交给了 Codex：查 AWS/Cloudflare 设置、改 OpenResty、处理 CloudFront Function、部署 Twikoo 前后的缓存问题，最后也把部署脚本补成 Cloudflare 和 CloudFront 双清。我这边更多是看最终效果是否符合预期，发现异常再反馈。走完这一轮之后只能感叹一句：Codex 这小子确实有进步了。

<!--more-->

## 第一轮：Cloudflare SaaS 绑定

第一反应是尝试 Cloudflare SaaS / Custom Hostnames。它看起来很适合“一个服务接多个业务域名”：业务域名挂到统一入口，Cloudflare 负责凭证和代理，后端服务只管响应。

当时实际试出的链路大致是：

```text
blog.js.gripe
  -> Cloudflare DNS 中切到 AWS 给的 CloudFront CNAME
  -> CloudFront origin: aws.js.gripe
  -> Cloudflare SaaS / Custom Hostname
  -> cf-cdn.js.gripe
  -> Cloudflare-proxied origin
```

其中 `aws.js.gripe` 没有开 Cloudflare 代理，作为 CloudFront origin 使用；`cf-cdn.js.gripe` 开 Cloudflare 代理，作为 Cloudflare SaaS 侧的回源域名。

预期是 CloudFront 只看到 `aws.js.gripe`，而 `aws.js.gripe` 背后仍然被 Cloudflare 代理层包住。实际测试却发现，`aws.js.gripe` 直接解析到了 `cf-cdn.js.gripe` 背后的源站 IP。也就是说，原本希望 SaaS 绑定提供的“隐藏源站入口”没有成立，AWS 回源侧仍然可能拿到真实源站地址。

这条 DNS 与 SaaS 组合链路没有形成我们想要的安全边界：

- `blog.js.gripe` 用户入口要交给 CloudFront。
- CloudFront origin 不能直接看到源站 IP。
- Cloudflare 只应该出现在回源保护层。
- OpenResty 仍然要按真实业务 Host 进入对应 vhost。

Cloudflare SaaS 绑定能解决另一类平台托管问题，但在这次迁移里，它没有同时满足这四个边界。所以第一轮先搁置。

## memecdn 给出的提醒

后来重新想到之前做过的 [jsw-teams/myzerossl](https://github.com/jsw-teams/myzerossl)。这个仓库后来演化成 memecdn，定位是低信任边缘 CDN 和 Keyless SSL proxy。

它的思路不是让每个公网边缘节点都可信，而是承认边缘节点低信任：

- edge VPS 只保存公开凭证链，不保存凭证私钥。
- TLS 握手签名交给可信 signer。
- 新 edge 需要注册、审批、拿 token，再连 signer。
- 缓存是可丢弃的，重启丢掉也不影响核心安全。
- 本地 setup wizard 只监听 `127.0.0.1`，首次配置通过 SSH tunnel 从工作站打开。

这个思路对这次迁移的启发是：公网入口不一定要持有核心秘密，也不一定要知道真实源站。低信任路径只做有限职责，真正的业务路由和敏感能力留在可信边界内。

在这次方案里，Cloudflare Tunnel 承担了类似的“有限职责”：

- 它不做业务入口。
- 它不做业务路由。
- 它不保存应用状态。
- 它只把 CloudFront 的 origin 请求带回源站本机埠。

CloudFront 负责用户入口和边缘分发，Cloudflare Tunnel 负责私有回源，OpenResty 负责恢复虚拟主机。

## 最终采用的链路

最终链路变成：

```text
visitor
  -> blog.js.gripe / www.js.gripe / dquery.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> CloudFront origin: aws-origin.js.gripe
  -> Cloudflare Tunnel
  -> 127.0.0.1:10480
  -> OpenResty origin proxy
  -> https://127.0.0.1:443 with restored Host
```

DNS 按角色分层：

```text
aws-origin.js.gripe
  -> d65ffd17-f5a0-4a88-850b-009f548637f9.cfargotunnel.com
  -> proxied: true
  -> 只给 CloudFront 回源使用

blog.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> 用户访问

www.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> 用户访问
```

这里的重点是：业务域名不再通过 Cloudflare 代理进入 CloudFront。Cloudflare 只保留在 `aws-origin.js.gripe` 这一段，用 Tunnel 把 CloudFront origin 请求带回源站。

如果公网响应里还能看到 `server: cloudflare` 或 `cf-ray`，不能马上判断业务域名开了 Cloudflare 代理。因为 CloudFront 回源到 `aws-origin.js.gripe` 时，origin 段本来就经过 Cloudflare Tunnel，部分响应标头可能会从回源段带回来。

## 两种回源组织方式

这里其实有两条路线。

第一条是不使用 CloudFront Function，而是给每个业务域名准备一个固定的中间 origin 名，并在 CloudFront origin 设置里静态写入 `X-Origin-Host`。

当时试过的形态是：

```text
blog.js.gripe
  -> CloudFront distribution
  -> origin: blog-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: blog.js.gripe
  -> Cloudflare Tunnel
  -> 127.0.0.1:10480
  -> OpenResty origin proxy
```

`www.js.gripe` 和根域名也可以按同样方式拆开：

```text
www.js.gripe
  -> origin: www-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: www.js.gripe

js.gripe
  -> origin: js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: js.gripe
```

Tunnel ingress 对应变成多条 hostname：

```yaml
ingress:
  - hostname: blog-js-gripe.aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - hostname: www-js-gripe.aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - hostname: js-gripe.aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - service: http_status:404
```

CloudFront origin 设置里则固定写一条自定义 header：

```json
{
  "DomainName": "blog-js-gripe.aws-origin.js.gripe",
  "CustomHeaders": {
    "Quantity": 1,
    "Items": [
      {
        "HeaderName": "X-Origin-Host",
        "HeaderValue": "blog.js.gripe"
      }
    ]
  }
}
```

OpenResty 侧当时不需要识别 `/_vhost/<host>` 前缀，因为 CloudFront 没有 Function，也不会改写 URI。origin proxy 只要从 `X-Origin-Host` 里取出真实业务域名，检查白名单，然后把原始路径转给本机 HTTPS vhost：

```nginx
map $http_x_origin_host $origin_requested_host {
    ~^([^,\s:]+)(?::[0-9]+)? $1;
    default "";
    "" "";
}

map $origin_requested_host $origin_host_allowed {
    default 0;
    blog.js.gripe 1;
    js.gripe 1;
    www.js.gripe 1;
}

server {
    listen 127.0.0.1:10480;
    server_name aws-origin.js.gripe;

    if ($origin_host_allowed = 0) {
        return 403;
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $origin_requested_host;
        proxy_set_header X-Forwarded-Host $origin_requested_host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
        proxy_ssl_name $origin_requested_host;
        proxy_pass https://127.0.0.1:443;
    }
}
```

这里 `proxy_set_header Host` 和 `proxy_ssl_name` 必须同时指向 `$origin_requested_host`。前者让 OpenResty 进入正确的业务 `server_name`，后者让本机 HTTPS 回源时使用对应的 SNI。否则请求可能到了 `127.0.0.1:443`，但落进默认 vhost 或凭证校验不匹配。

这条路线的好处很直接：不用 Function，不需要在 viewer request 阶段改 URI，也不会因为多个业务域名共用同一个 distribution 而额外考虑缓存 key 隔离。只要一个业务域名对应一个 distribution，或者至少对应一个明确的 origin/header 组合，OpenResty 就能靠 `X-Origin-Host` 还原真实 vhost。

它的问题不在技术可行性，而在方案额度。CloudFront 免费或固定费率方案里可用的 distribution 数量有限，当时实际上最多只能放三个。如果继续坚持“一个业务域名一个 distribution”，`blog.js.gripe`、`www.js.gripe`、`js.gripe` 三个域名刚好把额度用满，后面再把 `dquery`、`searchme`、`cf-relay` 这类动态转发或缓存策略不同的域名接进来，就没有余量了。

第二条路线是保留一个统一 origin，再用 CloudFront Function 在入口处识别 viewer host，把业务 host 写进 `X-Origin-Host`，并通过 `/_vhost/<host>` 前缀隔离缓存。这就是最后保留下来的方案。

## Tunnel 最后只保留一个统一 origin

每域名 distribution 的方案是可行的，只是更适合业务域名不超过方案上限，并且想完全避免 Function 的场景。我最后决定收敛成统一 origin，是因为 `js.gripe` 下面的业务域名会继续增加，不能把前三个域名之外的服务挡在 CloudFront 之外。

最后只保留一个 Tunnel 名：

```text
aws-origin.js.gripe
```

Cloudflare Tunnel ingress 只需要把它送到本机 origin proxy：

```yaml
ingress:
  - hostname: aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - service: http://127.0.0.1:10480
```

业务域名差异不再交给 Tunnel hostname 表达，而交给 CloudFront Function 的 `X-Origin-Host` 表达。

## CloudFront Function 完整设置

CloudFront distribution 使用一个 origin：

```text
Origin domain: aws-origin.js.gripe
Origin request policy: Managed-AllViewerExceptHostHeader
Cache policy: Managed-CachingOptimized
```

关键是 origin request policy 不转发 viewer 的 `Host`。如果直接把 `Host: blog.js.gripe` 转给 `aws-origin.js.gripe`，CloudFront origin 域名、TLS/SNI、Cloudflare Tunnel hostname、OpenResty 业务 host 会混在一起。我们也试过在 CloudFront Function 里改 `request.headers.host`，结果 CloudFront 直接校验失败。CloudFront Functions 不能用这种方式修改 Host。

所以 Function 放在 viewer request 阶段，完整负责这几件事：

- 校验 viewer host 是否在白名单里。
- 清理 viewer cookie，避免无意义的 cookie 进入 origin，也避免动态界面被过大的 cookie/header 拖出异常响应。
- 把 viewer host 写入 `X-Origin-Host`，交给 OpenResty origin proxy 恢复真实 vhost。
- 给 URI 加 `/_vhost/<host>` 前缀隔离缓存，并且避免重复加前缀。

一个完整的 viewer-request 函数如下：

```js
function handler(event) {
    var request = event.request;
    var hostHeader = request.headers.host;
    var host = hostHeader && hostHeader.value ? hostHeader.value.toLowerCase() : '';

    var allowed = {
        'blog.js.gripe': true,
        'dquery.js.gripe': true,
        'www.js.gripe': true,
        'js.gripe': true
    };

    if (!allowed[host]) {
        return {
            statusCode: 403,
            statusDescription: 'Forbidden'
        };
    }

    delete request.headers.cookie;
    request.headers['x-origin-host'] = { value: host };

    if (request.uri.indexOf('/_vhost/') !== 0) {
        request.uri = '/_vhost/' + host + request.uri;
    }

    return request;
}
```

这里的重点不是在边缘层做复杂业务逻辑，而是把 CloudFront 不能直接转发的 viewer host 显式转成一个受控 header。`delete request.headers.cookie` 也不是必选项，但对公开站点很实用：静态资源、文章页和大多数唯读界面不需要 viewer cookie，提前清掉可以减少回源请求差异，也降低异常大 header 影响 origin 的概率。

`/_vhost/<host>` 前缀要和 OpenResty origin proxy 配套。CloudFront cache key 看到的是改写后的 URI，例如：

```text
/_vhost/blog.js.gripe/zh-CN/posts/cloudflare-tunnel-cloudfront-origin/
/_vhost/www.js.gripe/
/_vhost/dquery.js.gripe/dns-query/example
```

OpenResty 再把这段前缀剥掉，把真正的请求路径转给本机 HTTPS vhost。这样多个业务域名即使共用同一个 CloudFront distribution，也不会在默认缓存策略下把同路径资源互相污染。

## OpenResty origin proxy 恢复真实 Host

Tunnel 本地入口监听：

```text
127.0.0.1:10480
```

这层不是业务站点，而是 OpenResty origin proxy。它从 `X-Origin-Host` 还原业务域名，检查白名单，去掉 CloudFront Function 加上的 `/_vhost/<host>` 前缀，然后反代到本机 HTTPS vhost。

目前核心设置是：

```nginx
map $http_x_origin_host $origin_requested_host {
    ~^([^,\s:]+)(?::[0-9]+)? $1;
    default $origin_forwarded_host;
    "" $origin_forwarded_host;
}

map $origin_requested_host $origin_host_allowed {
    default 0;
    account.js.gripe 1;
    blog.js.gripe 1;
    dns.js.gripe 1;
    dquery.js.gripe 1;
    gateway.js.gripe 1;
    js.gripe 1;
    search.js.gripe 1;
    sos.js.gripe 1;
    www.js.gripe 1;
}

server {
    listen 127.0.0.1:10480;
    server_name aws-origin.js.gripe;

    if ($origin_host_allowed = 0) {
        return 403;
    }

    location ~ ^/_vhost/[^/]+(?<origin_upstream_uri>/.*)$ {
        proxy_http_version 1.1;
        proxy_set_header Host $origin_requested_host;
        proxy_set_header X-Forwarded-Host $origin_requested_host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
        proxy_ssl_name $origin_requested_host;
        proxy_pass https://127.0.0.1:443$origin_upstream_uri$is_args$args;
    }
}
```

这个白名单很重要。统一 origin 如果不限制 host，很容易变成开放反代。CloudFront Function 有一层白名单，OpenResty origin proxy 再做一层白名单，两层都保留。

## 缓存和失效踩坑

CloudFront 默认缓存策略现在用 `Managed-CachingOptimized`。动态界面按路径单独建 behavior，需要实时回源的路径可以使用禁用缓存策略。

Function 加了 `/_vhost/<host>` 前缀后，缓存隔离更清晰，但失效时要确认实际 cache key。我们遇到过这种现象：

- 文章 HTML 已经更新。
- `client.js` 仍然返回旧版本。
- CloudFront invalidation 已经 completed。
- 响应标头里仍能看到 Cloudflare origin 段缓存命中。

最后处理方式是两层一起考虑：

- CloudFront 大改时先做 `/*` 失效。
- 静态资源 query 只用纯数字版本，例如 `?v=20260623`。
- 不再写 `?v=20260623-debug`、`?v=20260603-test` 这类带说明的版本号。
- 如果 Cloudflare origin 段缓存了旧资源，要么精确 purge，要么 bump 资源版本。

现在文章页使用：

```html
<link rel="stylesheet" href="/assets/site.css?v=20260623">
<script src="/assets/client.js?v=20260623" defer></script>
```

## 502、403 和凭证排查顺序

这套链路的错误要按层排查。

502 常见检查顺序：

1. 业务域名是否已经加到 CloudFront aliases。
2. ACM 凭证是否覆盖该业务域名，例如 `*.js.gripe`。
3. CloudFront distribution 是否已经 deployed。
4. CloudFront Function 是否已经 publish 到 LIVE。
5. Function allowlist 是否包含该 host。
6. Cloudflare DNS 是否指向 `d2085p9k6hhzsj.cloudfront.net`，且业务域名为 DNS-only。
7. `aws-origin.js.gripe` 是否仍然是 proxied Tunnel CNAME。
8. Tunnel ingress 是否指向 `http://127.0.0.1:10480`。
9. OpenResty origin proxy whitelist 是否包含该 host。
10. 本机 HTTPS vhost 是否有对应 `server_name`。
11. 本机 vhost 的 upstream 埠是否真的在监听。

403 通常来自两个地方：

- CloudFront Function 拒绝未知 viewer host。
- OpenResty origin proxy 拒绝未知 `X-Origin-Host`。

这两个 403 都是设计内行为，不应该为了省事改成全放行。

凭证也要分三层：

- 用户侧 TLS 在 CloudFront / ACM。
- `aws-origin.js.gripe` 在 Cloudflare Tunnel 侧。
- 本机 OpenResty vhost 使用源站凭证。

如果是新子域，先确认 ACM 包含它，再加 CloudFront alias，再加 DNS，再更新 Function 和 OpenResty 白名单。

## 隐私值怎么记录

这类迁移里会碰到很多 token、密钥、账号 ID 和凭证 ARN。文章里不应该贴完整值。

我自己的记录规则是：

- 域名、公开 CNAME、公开策略名可以写全。
- Cloudflare token、AWS access key、secret key 不写全。
- 如果必须定位某个凭证，只露前三位和后三位，中间打星号，例如 `cfu**********abc`。
- 数据库密码、后台管理密码、杂凑值也不写全。即便是杂凑，也按敏感信息处理。

这篇文章里只保留公开域名、公开 CloudFront distribution 域名和配置结构，不记录任何完整 token 或 secret。

## 为什么最后保留这套方案

Cloudflare SaaS 绑定不是不能用，只是它没有解决这次的真实问题。我们需要的是：

- 用户入口交给 CloudFront。
- 源站 IP 不被 AWS origin 侧直接解析到。
- Cloudflare 只作为私有回源通道。
- OpenResty 继续按业务 Host 管理多个 vhost。
- 动态界面和静态资源有不同缓存策略。
- 低信任公网络径不持有核心秘密。

memecdn / myzerossl 给出的启发是，不要让低信任节点承担超过它职责范围的能力。Cloudflare Tunnel 正好把这个思想放到了回源路径上：它只负责把 CloudFront 请求带回内网，业务路由仍然由 OpenResty 决定。

这套方案比“Cloudflare 直接代理源站”复杂，也比“CloudFront 直接回源公网 IP”复杂。但复杂度换来的是明确边界：CloudFront 管公网，Tunnel 管私有回源，OpenResty 管虚拟主机。
