---
title: "我們如何構建 dquery DNS 解析器"
description: "一次從 DNS-over-HTTPS 入口、個人 UUID 解析器、域名攔截規則到正規化快取的工程復盤，也順手解釋為什麼 DNS 提供商仍然能看到主機名。"
date: "2026-06-15"
updated: "2026-06-15"
translationKey: "building-dquery-dns-resolver"
tags: ["DNS", "DoH", "dquery", "網路服務"]
category: "網路服務"
draft: false
cover: ""
---

DNS 看起來像網際網路裡最樸素的一環：給一個域名，拿一個地址。真正把解析器做成公開服務後，才會發現它夾在很多邊界之間：隱私、快取、區域合規、污染、攔截、上游選擇、前端展示、控制台帳戶，以及一個小但很要命的細節：DNS 報文裡的 ID 每次都可能不同。

`dquery.js.gripe` 這次重構的目標，是把一個能用的 DNS-over-HTTPS 查詢入口整理成可維護的解析器服務。它既提供公開查詢，也提供個人 UUID 解析路徑；既能查詢，也能按規則對特定域名不解析或攔截；既要減少源站壓力，也不能為了快取命中犧牲 DNS 協定準確性。

<!--more-->

## 為什麼要做自己的解析器

DoH 解決的是「本機到解析器之間」的明文 DNS 暴露問題。它把 DNS 查詢放進 HTTPS 裡，區域網路、營運商鏈路和公共 Wi-Fi 不再輕易看到你正在查詢哪個域名。

但這不等於 DNS 查詢突然消失。解析器仍然會看到問題本身：你問了哪個主機名、問的是 A 還是 AAAA、查詢來自什麼區域、是否帶 ECS，等等。換句話說，把 DNS 換成 DoH 後，信任對象從沿路網路設備轉移到了 DoH 提供商。

這也是自建解析器的意義：至少你知道查詢日誌、快取策略、攔截邏輯和上游選擇是怎樣被實作的，而不是把所有行為交給一個黑盒。

## 入口：公開查詢和個人 UUID

這次我們把查詢入口收斂到兩個形式：

```text
https://dquery.js.gripe/dns-query
https://dquery.js.gripe/dns-query/{resolver_uuid}
```

公開入口適合普通網頁查詢、臨時測試和不帶個人規則的 DoH 使用。個人入口使用成熟 UUID，而不是早期 `usr_...` 這類路徑。UUID 不代表「加密身份」，它只是穩定、可管理、也不暴露內部使用者 ID 的解析器標識。

## 對特定域名不解析或攔截

解析器不只是「轉發器」。它也可以在本地做決策。

如果使用者希望對一批域名執行阻斷，dquery 會在真正回源之前檢查個人規則和規則集。如果命中 block 策略，可以直接返回 NXDOMAIN，也可以返回指向阻斷頁的響應。這樣命中阻斷的域名不會繼續向上游洩露，不同 profile 也能有不同規則。

這類「本地不解析」不是為了偽裝網路狀態，而是為了讓使用者知道：哪些域名是自己明確選擇不解析，哪些是上游返回結果，哪些是區域策略導致不可用。

## DNS 提供商仍然能看到主機名

很多人把 DoH 理解成「DNS 隱私的終點」，這其實太樂觀。DoH 只是保護傳輸鏈路，不會讓解析器不知道你問了什麼。

如果你使用第三方 DNS 服務，對方理論上能看到查詢主機名。更進一步，如果解析鏈路上存在強制污染、劫持或策略性攔截，使用者收到的結果可能不是權威 DNS 本來的結果。現實裡常見的例子包括反詐攔截、營運商級域名重定向、地區性 DNS 污染，以及某些公共解析服務在特定地區配合返回被改寫的答案。

2010 年，中國數字時代轉載報導提到，DNS 污染曾影響到中國境外，Netnod 維護的中國根伺服器鏡像一度被撤回路由通告、與國際網際網路切斷連接。更準確地說，這不是「中國控制根伺服器後被取消資格」，而是根伺服器鏡像因異常影響被從全球路由中隔離。參見：[DNS污染問題發生後中國關閉根伺服器](https://chinadigitaltimes.net/chinese/54479.html)。

2014 年中國大陸大規模網路異常也常被拿來討論 DNS 污染的風險。相關條目記錄，當時大量域名被解析到同一錯誤 IP，外界對原因有不同說法，其中一種調查方向認為這與防火長城的 DNS 污染配置有關。參見：[2014年中國大陸網路異常事件](https://zh.wikipedia.org/zh-hans/2014%E5%B9%B4%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86%E7%BD%91%E7%BB%9C%E5%BC%82%E5%B8%B8%E4%BA%8B%E4%BB%B6)。

這些事件給解析器設計留下的經驗很簡單：DNS 不是絕對中立的管道。上游能看見查詢，也可能被要求或被迫改變答案。

## 區域策略和快取

dquery 對公開匿名入口保留區域策略。前端查詢、公開匿名 DoH、個人 UUID DoH 被分開處理：前端查詢更像網頁工具，不應因初始化狀態或區域判斷就不可用；公開匿名 DoH 可以按地區返回 451；個人 UUID 入口則更強調帳戶、規則和 profile 綁定。

快取的陷阱在 DNS wire message 裡的 request ID。很多客戶端每次查詢都會換 ID。如果 CDN 按完整 `dns=` 參數快取，同一個域名、同一個類型也會因 ID 不同被當成不同 URL。

正式鏈路最後選擇讓 Go 後端做正規化：後端快取鍵不包含 DNS ID，但返回快取命中時會把 response ID 改回當前查詢 ID。OpenResty 的 DoH 代理快取被關閉，因為它無法在命中時重寫 DNS response ID。

目前策略是：

```text
源站 MISS/BYPASS -> Cache-Control: no-store
源站 HIT/STALE  -> Cache-Control: public, max-age=..., s-maxage=...
```

Cloudflare Cache Rule 只把 `/dns-query` 及其子路徑納入範圍，並遵循源站快取頭：

```text
(http.host eq "dquery.js.gripe" and http.request.method eq "GET" and starts_with(http.request.uri.path, "/dns-query"))
```

這不是讓 CDN 理解 DNS wire message。真正的 DNS 正規化在源站完成，CDN 只快取源站已確認安全共享的結果。

## 最後的狀態

這次重構後，dquery 的核心邊界更清楚：

- `/dns-query` 是公開 DoH 查詢入口。
- `/dns-query/{uuid}` 是個人解析器入口。
- 個人規則可以對域名執行允許、阻斷、NXDOMAIN 或阻斷頁邏輯。
- 匿名入口可以按區域策略拒絕。
- Worker 不在正式 DoH 鏈路上消耗請求數。
- Go 後端負責 DNS ID 正規化快取，並在 HIT 時重寫 response ID。
- CDN 只快取源站已標記為 HIT/STALE 的響應。

DNS 服務很容易被做成一個「能返回答案」的小程式。真正難的是承認它處在信任、合規和協定細節的交界處。

