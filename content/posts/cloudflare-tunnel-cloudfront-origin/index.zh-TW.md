---
title: "不暴露源站公網 IP，如何接入 AWS CloudFront"
description: "一次用 Cloudflare Tunnel 為 AWS CloudFront 建立私有回源的工程復盤：從 Cloudflare SaaS 綁定踩坑，到統一 origin、CloudFront Function 與 OpenResty 多虛擬主機轉發。"
date: "2026-06-23"
updated: "2026-06-23"
translationKey: "cloudflare-tunnel-cloudfront-origin"
tags: ["Cloudflare Tunnel", "CloudFront", "OpenResty", "AWS", "回源"]
category: "技術實作"
draft: false
cover: "https://pictor.js.gripe/i/496527fc-d5c9-4b97-5aea-0bed8e8ac600/public.png"
---

這次遷移並不是一開始就決定使用 CloudFront + Cloudflare Tunnel。

最初的問題很具體：`js.gripe` 下面已經有多個 OpenResty 虛擬主機，像是 `blog.js.gripe`、`www.js.gripe`、`dquery.js.gripe`。它們各自有不同的靜態資源、動態介面、快取策略和憑證行為。原本的 Cloudflare 代理可以讓站點跑起來，但當我開始研究 CloudFront 固定費率方案時，AWS 又重新進入候選。

真正讓我重新嘗試 CloudFront 的原因，是面向中國大陸使用者時，AWS 的連通性看起來比 Cloudflare 更值得測試。原本的 Cloudflare 代理可用，但訪問體驗不一定穩定；如果 CloudFront 在這部分使用者上表現更好，就值得把它放到前台驗證。

CloudFront 以前讓我猶豫的是帳單模型。pay-as-you-go 下，請求、流量、WAF、日誌、邊緣函式都分開計費。小站平時可能很便宜，但遇到爬蟲、DDoS、快取命中率下降、動態介面突然變多時，帳單不確定性會放大。最近看到 CloudFront flat-rate pricing plans 之後，嘗試成本下降了：它把 CDN、WAF、DDoS 防護、DNS、TLS 憑證、日誌、Serverless Edge Compute 等能力放進月度方案，並強調 no overage charges。於是用 CloudFront Functions 做 host 路由、快取隔離、cookie 清理這些輕量邏輯，就不再只是「每次呼叫都要算帳」的心理負擔。

真正繞了一圈的，是如何讓 CloudFront 回源，同時不暴露源站 IP。

順便也得吐槽一句：到現在 CloudFront 設 origin 仍然不能直接填 IP，必須填一個域名。這個限制在普通公網源站場景裡只是有點麻煩，但放到「不暴露源站 IP」的目標下，就變成了架構約束：我們必須先準備一個不會洩漏真實源站地址的 origin hostname，再讓這個 hostname 透過 Tunnel 回到本機。後面的 `aws-origin.js.gripe`、每域名中間 origin，以及統一 origin 方案，都是圍繞這個限制展開的。

這次遷移的大部分排查和實際操作都交給了 Codex：查 AWS/Cloudflare 設定、改 OpenResty、處理 CloudFront Function、部署 Twikoo 前後的快取問題，最後也把部署腳本補成 Cloudflare 和 CloudFront 雙清。我這邊更多是看最終效果是否符合預期，發現異常再回饋。走完這一輪之後只能感嘆一句：Codex 這小子確實有進步了。

<!--more-->

## 第一輪：Cloudflare SaaS 綁定

第一反應是嘗試 Cloudflare SaaS / Custom Hostnames。它看起來很適合「一個服務接多個業務域名」：業務域名掛到統一入口，Cloudflare 負責憑證和代理，後端服務只管回應。

當時實際試出的鏈路大致是：

```text
blog.js.gripe
  -> Cloudflare DNS 中切到 AWS 給的 CloudFront CNAME
  -> CloudFront origin: aws.js.gripe
  -> Cloudflare SaaS / Custom Hostname
  -> cf-cdn.js.gripe
  -> Cloudflare-proxied origin
```

其中 `aws.js.gripe` 沒有開 Cloudflare 代理，作為 CloudFront origin 使用；`cf-cdn.js.gripe` 開 Cloudflare 代理，作為 Cloudflare SaaS 側的回源域名。

預期是 CloudFront 只看到 `aws.js.gripe`，而 `aws.js.gripe` 背後仍然被 Cloudflare 代理層包住。實際測試卻發現，`aws.js.gripe` 直接解析到了 `cf-cdn.js.gripe` 背後的源站 IP。也就是說，原本希望 SaaS 綁定提供的「隱藏源站入口」沒有成立，AWS 回源側仍然可能拿到真實源站地址。

這條 DNS 與 SaaS 組合鏈路沒有形成我們想要的安全邊界：

- `blog.js.gripe` 使用者入口要交給 CloudFront。
- CloudFront origin 不能直接看到源站 IP。
- Cloudflare 只應該出現在回源保護層。
- OpenResty 仍然要按真實業務 Host 進入對應 vhost。

Cloudflare SaaS 綁定能解決另一類平台託管問題，但在這次遷移裡，它沒有同時滿足這四個邊界。所以第一輪先擱置。

## memecdn 給出的提醒

後來重新想到之前做過的 [jsw-teams/myzerossl](https://github.com/jsw-teams/myzerossl)。這個倉庫後來演化成 memecdn，定位是低信任邊緣 CDN 和 Keyless SSL proxy。

它的思路不是讓每個公網邊緣節點都可信，而是承認邊緣節點低信任：

- edge VPS 只保存公開憑證鏈，不保存憑證私鑰。
- TLS 握手簽名交給可信 signer。
- 新 edge 需要註冊、審批、拿 token，再連 signer。
- 快取是可丟棄的，重啟丟掉也不影響核心安全。
- 本地 setup wizard 只監聽 `127.0.0.1`，首次配置透過 SSH tunnel 從工作站打開。

這個思路對這次遷移的啟發是：公網入口不一定要持有核心秘密，也不一定要知道真實源站。低信任路徑只做有限職責，真正的業務路由和敏感能力留在可信邊界內。

在這次方案裡，Cloudflare Tunnel 承擔了類似的「有限職責」：

- 它不做業務入口。
- 它不做業務路由。
- 它不保存應用狀態。
- 它只把 CloudFront 的 origin 請求帶回源站本機埠。

CloudFront 負責使用者入口和邊緣分發，Cloudflare Tunnel 負責私有回源，OpenResty 負責恢復虛擬主機。

## 最終採用的鏈路

最終鏈路變成：

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

DNS 按角色分層：

```text
aws-origin.js.gripe
  -> d65ffd17-f5a0-4a88-850b-009f548637f9.cfargotunnel.com
  -> proxied: true
  -> 只給 CloudFront 回源使用

blog.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> 使用者訪問

www.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> 使用者訪問
```

這裡的重點是：業務域名不再透過 Cloudflare 代理進入 CloudFront。Cloudflare 只保留在 `aws-origin.js.gripe` 這一段，用 Tunnel 把 CloudFront origin 請求帶回源站。

如果公網回應裡還能看到 `server: cloudflare` 或 `cf-ray`，不能馬上判斷業務域名開了 Cloudflare 代理。因為 CloudFront 回源到 `aws-origin.js.gripe` 時，origin 段本來就經過 Cloudflare Tunnel，部分回應標頭可能會從回源段帶回來。

## 兩種回源組織方式

這裡其實有兩條路線。

第一條是不使用 CloudFront Function，而是給每個業務域名準備一個固定的中間 origin 名，並在 CloudFront origin 設定裡靜態寫入 `X-Origin-Host`。

當時試過的形態是：

```text
blog.js.gripe
  -> CloudFront distribution
  -> origin: blog-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: blog.js.gripe
  -> Cloudflare Tunnel
  -> 127.0.0.1:10480
  -> OpenResty origin proxy
```

`www.js.gripe` 和根域名也可以按同樣方式拆開：

```text
www.js.gripe
  -> origin: www-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: www.js.gripe

js.gripe
  -> origin: js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: js.gripe
```

Tunnel ingress 對應變成多條 hostname：

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

CloudFront origin 設定裡則固定寫一條自訂 header：

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

OpenResty 側當時不需要識別 `/_vhost/<host>` 前綴，因為 CloudFront 沒有 Function，也不會改寫 URI。origin proxy 只要從 `X-Origin-Host` 裡取出真實業務域名，檢查白名單，然後把原始路徑轉給本機 HTTPS vhost：

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

這裡 `proxy_set_header Host` 和 `proxy_ssl_name` 必須同時指向 `$origin_requested_host`。前者讓 OpenResty 進入正確的業務 `server_name`，後者讓本機 HTTPS 回源時使用對應的 SNI。否則請求可能到了 `127.0.0.1:443`，但落進預設 vhost 或憑證校驗不匹配。

這條路線的好處很直接：不用 Function，不需要在 viewer request 階段改 URI，也不會因為多個業務域名共用同一個 distribution 而額外考慮快取 key 隔離。只要一個業務域名對應一個 distribution，或者至少對應一個明確的 origin/header 組合，OpenResty 就能靠 `X-Origin-Host` 還原真實 vhost。

它的問題不在技術可行性，而在方案額度。CloudFront 免費或固定費率方案裡可用的 distribution 數量有限，當時實際上最多只能放三個。如果繼續堅持「一個業務域名一個 distribution」，`blog.js.gripe`、`www.js.gripe`、`js.gripe` 三個域名剛好把額度用滿，後面再把 `dquery`、`searchme`、`cf-relay` 這類動態轉發或快取策略不同的域名接進來，就沒有餘量了。

第二條路線是保留一個統一 origin，再用 CloudFront Function 在入口處識別 viewer host，把業務 host 寫進 `X-Origin-Host`，並透過 `/_vhost/<host>` 前綴隔離快取。這就是最後保留下來的方案。

## Tunnel 最後只保留一個統一 origin

每域名 distribution 的方案是可行的，只是更適合業務域名不超過方案上限，並且想完全避免 Function 的場景。我最後決定收斂成統一 origin，是因為 `js.gripe` 下面的業務域名會繼續增加，不能把前三個域名之外的服務擋在 CloudFront 之外。

最後只保留一個 Tunnel 名：

```text
aws-origin.js.gripe
```

Cloudflare Tunnel ingress 只需要把它送到本機 origin proxy：

```yaml
ingress:
  - hostname: aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - service: http://127.0.0.1:10480
```

業務域名差異不再交給 Tunnel hostname 表達，而交給 CloudFront Function 的 `X-Origin-Host` 表達。

## CloudFront Function 完整設定

CloudFront distribution 使用一個 origin：

```text
Origin domain: aws-origin.js.gripe
Origin request policy: Managed-AllViewerExceptHostHeader
Cache policy: Managed-CachingOptimized
```

關鍵是 origin request policy 不轉發 viewer 的 `Host`。如果直接把 `Host: blog.js.gripe` 轉給 `aws-origin.js.gripe`，CloudFront origin 域名、TLS/SNI、Cloudflare Tunnel hostname、OpenResty 業務 host 會混在一起。我們也試過在 CloudFront Function 裡改 `request.headers.host`，結果 CloudFront 直接校驗失敗。CloudFront Functions 不能用這種方式修改 Host。

所以 Function 放在 viewer request 階段，完整負責這幾件事：

- 校驗 viewer host 是否在白名單裡。
- 清理 viewer cookie，避免無意義的 cookie 進入 origin，也避免動態介面被過大的 cookie/header 拖出異常回應。
- 把 viewer host 寫入 `X-Origin-Host`，交給 OpenResty origin proxy 恢復真實 vhost。
- 給 URI 加 `/_vhost/<host>` 前綴隔離快取，並且避免重複加前綴。

一個完整的 viewer-request 函式如下：

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

這裡的重點不是在邊緣層做複雜業務邏輯，而是把 CloudFront 不能直接轉發的 viewer host 顯式轉成一個受控 header。`delete request.headers.cookie` 也不是必選項，但對公開站點很實用：靜態資源、文章頁和大多數唯讀介面不需要 viewer cookie，提前清掉可以減少回源請求差異，也降低異常大 header 影響 origin 的機率。

`/_vhost/<host>` 前綴要和 OpenResty origin proxy 配套。CloudFront cache key 看到的是改寫後的 URI，例如：

```text
/_vhost/blog.js.gripe/zh-CN/posts/cloudflare-tunnel-cloudfront-origin/
/_vhost/www.js.gripe/
/_vhost/dquery.js.gripe/dns-query/example
```

OpenResty 再把這段前綴剝掉，把真正的請求路徑轉給本機 HTTPS vhost。這樣多個業務域名即使共用同一個 CloudFront distribution，也不會在預設快取策略下把同路徑資源互相污染。

## OpenResty origin proxy 恢復真實 Host

Tunnel 本地入口監聽：

```text
127.0.0.1:10480
```

這層不是業務站點，而是 OpenResty origin proxy。它從 `X-Origin-Host` 還原業務域名，檢查白名單，去掉 CloudFront Function 加上的 `/_vhost/<host>` 前綴，然後反代到本機 HTTPS vhost。

目前核心設定是：

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

這個白名單很重要。統一 origin 如果不限制 host，很容易變成開放反代。CloudFront Function 有一層白名單，OpenResty origin proxy 再做一層白名單，兩層都保留。

## 快取和失效踩坑

CloudFront 預設快取策略現在用 `Managed-CachingOptimized`。動態介面按路徑單獨建 behavior，需要即時回源的路徑可以使用禁用快取策略。

Function 加了 `/_vhost/<host>` 前綴後，快取隔離更清晰，但失效時要確認實際 cache key。我們遇到過這種現象：

- 文章 HTML 已經更新。
- `client.js` 仍然返回舊版本。
- CloudFront invalidation 已經 completed。
- 回應標頭裡仍能看到 Cloudflare origin 段快取命中。

最後處理方式是兩層一起考慮：

- CloudFront 大改時先做 `/*` 失效。
- 靜態資源 query 只用純數字版本，例如 `?v=20260623`。
- 不再寫 `?v=20260623-debug`、`?v=20260603-test` 這類帶說明的版本號。
- 如果 Cloudflare origin 段快取了舊資源，要麼精確 purge，要麼 bump 資源版本。

現在文章頁使用：

```html
<link rel="stylesheet" href="/assets/site.css?v=20260623">
<script src="/assets/client.js?v=20260623" defer></script>
```

## 502、403 和憑證排查順序

這套鏈路的錯誤要按層排查。

502 常見檢查順序：

1. 業務域名是否已經加到 CloudFront aliases。
2. ACM 憑證是否覆蓋該業務域名，例如 `*.js.gripe`。
3. CloudFront distribution 是否已經 deployed。
4. CloudFront Function 是否已經 publish 到 LIVE。
5. Function allowlist 是否包含該 host。
6. Cloudflare DNS 是否指向 `d2085p9k6hhzsj.cloudfront.net`，且業務域名為 DNS-only。
7. `aws-origin.js.gripe` 是否仍然是 proxied Tunnel CNAME。
8. Tunnel ingress 是否指向 `http://127.0.0.1:10480`。
9. OpenResty origin proxy whitelist 是否包含該 host。
10. 本機 HTTPS vhost 是否有對應 `server_name`。
11. 本機 vhost 的 upstream 埠是否真的在監聽。

403 通常來自兩個地方：

- CloudFront Function 拒絕未知 viewer host。
- OpenResty origin proxy 拒絕未知 `X-Origin-Host`。

這兩個 403 都是設計內行為，不應該為了省事改成全放行。

憑證也要分三層：

- 使用者側 TLS 在 CloudFront / ACM。
- `aws-origin.js.gripe` 在 Cloudflare Tunnel 側。
- 本機 OpenResty vhost 使用源站憑證。

如果是新子域，先確認 ACM 包含它，再加 CloudFront alias，再加 DNS，再更新 Function 和 OpenResty 白名單。

## 隱私值怎麼記錄

這類遷移裡會碰到很多 token、密鑰、帳號 ID 和憑證 ARN。文章裡不應該貼完整值。

我自己的記錄規則是：

- 域名、公開 CNAME、公開策略名可以寫全。
- Cloudflare token、AWS access key、secret key 不寫全。
- 如果必須定位某個憑證，只露前三位和後三位，中間打星號，例如 `cfu**********abc`。
- 資料庫密碼、後台管理密碼、雜湊值也不寫全。即便是雜湊，也按敏感資訊處理。

這篇文章裡只保留公開域名、公開 CloudFront distribution 域名和配置結構，不記錄任何完整 token 或 secret。

## 為什麼最後保留這套方案

Cloudflare SaaS 綁定不是不能用，只是它沒有解決這次的真實問題。我們需要的是：

- 使用者入口交給 CloudFront。
- 源站 IP 不被 AWS origin 側直接解析到。
- Cloudflare 只作為私有回源通道。
- OpenResty 繼續按業務 Host 管理多個 vhost。
- 動態介面和靜態資源有不同快取策略。
- 低信任公網路徑不持有核心秘密。

memecdn / myzerossl 給出的啟發是，不要讓低信任節點承擔超過它職責範圍的能力。Cloudflare Tunnel 正好把這個思想放到了回源路徑上：它只負責把 CloudFront 請求帶回內網，業務路由仍然由 OpenResty 決定。

這套方案比「Cloudflare 直接代理源站」複雜，也比「CloudFront 直接回源公網 IP」複雜。但複雜度換來的是明確邊界：CloudFront 管公網，Tunnel 管私有回源，OpenResty 管虛擬主機。
