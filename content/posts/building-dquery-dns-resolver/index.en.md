---
title: "How we built the dquery DNS resolver"
description: "A practical write-up on dquery: DNS-over-HTTPS endpoints, per-user UUID resolvers, domain blocking rules, DNS provider visibility, and normalized caching."
date: "2026-06-15"
updated: "2026-06-15"
translationKey: "building-dquery-dns-resolver"
tags: ["DNS", "DoH", "dquery", "Network Services"]
category: "Network Services"
draft: false
cover: ""
---

DNS looks like one of the simplest parts of the Internet: give it a name, get back an address. Once you run a public resolver, it becomes much less simple. A resolver sits between privacy, caching, regional compliance, upstream trust, blocking rules, front-end UX, account management, and a tiny protocol detail that matters a lot: the DNS message ID may change on every request.

The recent `dquery.js.gripe` rebuild turned a working DNS-over-HTTPS endpoint into a more maintainable resolver service. It supports a public endpoint, per-user UUID resolver URLs, local domain blocking rules, source-side normalized caching, and Cloudflare CDN caching only after the origin has already confirmed a safe cache hit.

<!--more-->

## Why build our own resolver

DoH protects the path between a client and a resolver. It puts DNS queries inside HTTPS, so the local network, ISP path, or public Wi-Fi no longer sees plain DNS questions.

But the resolver still sees the question. It knows the hostname, record type, approximate region, and whether the query carries client subnet information. DoH changes who you trust; it does not make the query disappear.

That is the reason to build a resolver we can inspect. We can decide what is logged, what is cached, how blocking works, which upstreams are used, and what happens when a request is rejected.

## Public and personal endpoints

dquery now uses two endpoint shapes:

```text
https://dquery.js.gripe/dns-query
https://dquery.js.gripe/dns-query/{resolver_uuid}
```

The public endpoint is for ordinary DoH queries and web lookups. The personal endpoint uses a mature UUID instead of the older `usr_...` style path. The UUID is not a secret identity system; it is a stable resolver identifier that does not expose the internal user ID.

The personal endpoint is bound to the local account system. The console displays the user's resolver URL and lets the user manage profiles, rules, blocking behavior, and logs. SSO is better treated as an external identity binding, not as the primary resolver account model.

## Blocking or refusing selected domains

A resolver does not have to be only a forwarding proxy. It can make local decisions before sending a question upstream.

For example, a user may choose to block a set of domains. dquery checks personal rules and rule sets before upstream resolution. If a domain matches a block rule, the resolver can return NXDOMAIN or a response pointing to a block page. This keeps the decision local and avoids leaking blocked queries to the upstream resolver.

The point is not to fake network conditions. The point is to make the reason clear: this name was blocked by a local rule, this one came from upstream, and this one was rejected by a regional policy.

## DNS providers can still see hostnames

DoH is often described as if it were the final answer to DNS privacy. It is not. It protects transport, but the resolver still knows what you asked.

If you use a third-party DNS provider, that provider can theoretically see queried hostnames. If the resolver path is subject to forced filtering, hijacking, or policy-based interception, the answer may differ from what authoritative DNS would have returned. Common examples include anti-fraud interception, ISP-level redirection, regional DNS pollution, and public resolvers in certain jurisdictions being required or pressured to return altered answers.

This is not a purely theoretical concern. In 2010, China Digital Times republished a report saying that DNS pollution had leaked outside China and that a Netnod-operated root server mirror in China was isolated by withdrawing its route announcements. More precisely, this was about isolating a root mirror route, not China “losing ownership of root servers.” See: [DNS pollution issue followed by China root server shutdown](https://chinadigitaltimes.net/chinese/54479.html).

The 2014 mainland China network incident is another useful case study. The related article records that a large number of domains were resolved to the same wrong IP, with multiple competing explanations; one line of investigation connected it to DNS pollution configuration in the Great Firewall. See: [2014 mainland China network anomaly](https://zh.wikipedia.org/zh-hans/2014%E5%B9%B4%E4%B8%AD%E5%9B%BD%E5%A4%A7%E9%99%86%E7%BD%91%E7%BB%9C%E5%BC%82%E5%B8%B8%E4%BA%8B%E4%BB%B6).

The design lesson is simple: DNS is not a perfectly neutral pipe. Upstreams can see queries, and in some environments they may be asked or forced to alter answers.

## Regional policy and cache correctness

dquery keeps regional policy on the public anonymous endpoint. The web lookup, public anonymous DoH, and personal UUID DoH are separate surfaces: the web lookup should remain available as a tool; anonymous DoH may return 451 in some regions; personal UUID DoH is tied to accounts, profiles, and rules.

Caching brought a subtle DNS-specific trap. DNS wire messages contain a request ID, and many clients change it every time. If a CDN caches by the full `dns=` query string, the same hostname and record type may still become a different URL because the message ID changed.

We first tried doing normalization in a Worker: parse the `dns=` parameter, zero out the DNS ID for the cache key, and rewrite the response ID on cache hits. It worked well, but every personal DoH request still consumed a Worker request. For a high-frequency DNS endpoint, that cost becomes the problem.

The final production path moved normalization to the Go origin. The origin cache key excludes the DNS ID, and on HIT the resolver rewrites the DNS response ID back to the current request ID. OpenResty DoH proxy caching was disabled because it cannot rewrite the DNS response body on cache hits.

The current cache policy is:

```text
origin MISS/BYPASS -> Cache-Control: no-store
origin HIT/STALE  -> Cache-Control: public, max-age=..., s-maxage=...
```

Cloudflare Cache Rules include `/dns-query` and its subpaths, while respecting origin cache headers:

```text
(http.host eq "dquery.js.gripe" and http.request.method eq "GET" and starts_with(http.request.uri.path, "/dns-query"))
```

This does not make the CDN understand DNS wire messages. DNS normalization happens at the origin. The CDN only stores responses that the origin has already marked as safe to share.

## Current shape

After the rebuild:

- `/dns-query` is the public DoH endpoint.
- `/dns-query/{uuid}` is the personal resolver endpoint.
- Personal rules can allow, block, return NXDOMAIN, or point to a block page.
- Anonymous access can be rejected by regional policy.
- Worker is no longer on the production DoH path.
- The Go origin handles DNS ID normalization and rewrites response IDs on cache hits.
- The CDN only caches origin HIT/STALE responses.

A DNS service is easy to build if the only requirement is “return an answer.” The hard part is explaining why it resolved, why it refused, why it blocked, why it cached, and whether the cached DNS message is still protocol-correct.

