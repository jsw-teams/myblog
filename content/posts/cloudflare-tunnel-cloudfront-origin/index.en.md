---
title: "Using AWS CloudFront Without Exposing the Origin's Public IP"
description: "A practical migration write-up on using Cloudflare Tunnel as a private origin path for AWS CloudFront, covering the failed Cloudflare SaaS attempt, a unified origin, CloudFront Functions, and OpenResty virtual-host routing."
date: "2026-06-23"
updated: "2026-06-23"
translationKey: "cloudflare-tunnel-cloudfront-origin"
tags: ["Cloudflare Tunnel", "CloudFront", "OpenResty", "AWS", "Origin"]
category: "Technical Practice"
draft: false
cover: "https://pictor.js.gripe/i/496527fc-d5c9-4b97-5aea-0bed8e8ac600/public.png"
---

This migration did not start with a decision to use CloudFront plus Cloudflare Tunnel.

The original problem was concrete: under `js.gripe`, there were already several OpenResty virtual hosts, including `blog.js.gripe`, `www.js.gripe`, and `dquery.js.gripe`. They had different static assets, dynamic endpoints, cache policies, and certificate behavior. The old Cloudflare proxy setup kept the sites running, but when I started looking at CloudFront's flat-rate plans, AWS became worth reconsidering.

The real reason I wanted to try CloudFront again was connectivity for users in mainland China. Cloudflare worked, but the access experience was not always stable. If CloudFront could perform better for that audience, it was worth putting it in front and testing.

The part that had made me hesitate before was billing. Under pay-as-you-go, requests, traffic, WAF, logs, and edge compute are all separate line items. A small site may be cheap most of the time, but crawlers, DDoS traffic, lower cache hit rates, or a sudden increase in dynamic requests can make the bill harder to reason about. After seeing CloudFront flat-rate pricing plans, the cost of trying it dropped: CDN, WAF, DDoS protection, DNS, TLS certificates, logs, and Serverless Edge Compute are bundled into a monthly plan with no overage charges. That made lightweight CloudFront Functions for host routing, cache separation, and cookie cleanup feel less like something I had to meter on every request.

The part that took the long way around was origin access: how to let CloudFront reach the origin without exposing the origin IP.

One small complaint belongs here: even now, a CloudFront origin still cannot simply be an IP address. It has to be a domain name. In an ordinary public-origin setup, that is merely annoying. Under the goal of not exposing the origin IP, it becomes an architectural constraint: I first needed an origin hostname that would not leak the real server address, and then had to bring that hostname back to the machine through a Tunnel. The later `aws-origin.js.gripe`, per-host intermediate origins, and unified-origin design all grew out of that constraint.

Most of the debugging and hands-on work in this migration was delegated to Codex: inspecting AWS and Cloudflare configuration, editing OpenResty, wiring the CloudFront Function, dealing with cache issues around the Twikoo transition, and finally updating the deploy script so it purges both Cloudflare and CloudFront. My role was mostly to verify the final behavior and report anything that still looked wrong. After this round, I have to admit it: Codex has gotten better.

<!--more-->

## First Attempt: Cloudflare SaaS

My first instinct was to try Cloudflare SaaS / Custom Hostnames. It looks like a natural fit for "one service behind many business domains": point customer-facing hostnames at a unified entry point, let Cloudflare handle certificates and proxying, and keep the backend focused on responses.

The test path looked roughly like this:

```text
blog.js.gripe
  -> Cloudflare DNS switched to the CloudFront CNAME from AWS
  -> CloudFront origin: aws.js.gripe
  -> Cloudflare SaaS / Custom Hostname
  -> cf-cdn.js.gripe
  -> Cloudflare-proxied origin
```

In that setup, `aws.js.gripe` was not proxied by Cloudflare and was used as the CloudFront origin. `cf-cdn.js.gripe` was proxied and acted as the Cloudflare SaaS origin.

The expectation was that CloudFront would only see `aws.js.gripe`, while `aws.js.gripe` would still be wrapped by Cloudflare's proxy layer. In testing, however, `aws.js.gripe` resolved directly to the origin IP behind `cf-cdn.js.gripe`. In other words, the "hidden origin entry point" I expected from the SaaS binding did not hold. The AWS origin side could still end up with the real origin address.

This DNS plus SaaS composition did not create the boundary I needed:

- `blog.js.gripe` should be the user-facing CloudFront entry.
- The CloudFront origin should not directly see the origin IP.
- Cloudflare should only appear in the origin-protection segment.
- OpenResty should still route by the real business `Host` into the right vhost.

Cloudflare SaaS solves a different kind of platform-hosting problem. For this migration, it did not satisfy all four boundaries at the same time, so I put that path aside.

## The Reminder From memecdn

Later, I remembered an earlier project: [jsw-teams/myzerossl](https://github.com/jsw-teams/myzerossl). That repository eventually evolved into memecdn, a low-trust edge CDN and Keyless SSL proxy.

The idea was not to make every public edge node trusted. It was to accept that edge nodes are low-trust:

- Edge VPS nodes only keep the public certificate chain, not the private key.
- TLS handshake signing is delegated to a trusted signer.
- A new edge must register, be approved, receive a token, and then connect to the signer.
- Cache is disposable; losing it after a restart does not affect core security.
- The local setup wizard only listens on `127.0.0.1`, and initial setup is opened from a workstation through an SSH tunnel.

The lesson for this migration was that a public entry path does not have to hold core secrets, and it does not have to know the real origin. A low-trust path should have a narrow role, while business routing and sensitive capabilities stay inside the trusted boundary.

In this design, Cloudflare Tunnel plays a similar limited role:

- It is not the business entry point.
- It does not perform business routing.
- It does not store application state.
- It only carries CloudFront origin requests back to a local origin port.

CloudFront handles the user-facing edge and distribution. Cloudflare Tunnel handles the private origin path. OpenResty restores the virtual host.

## Final Request Path

The final path became:

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

DNS is split by role:

```text
aws-origin.js.gripe
  -> d65ffd17-f5a0-4a88-850b-009f548637f9.cfargotunnel.com
  -> proxied: true
  -> only used by CloudFront as origin

blog.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> user traffic

www.js.gripe
  -> d2085p9k6hhzsj.cloudfront.net
  -> proxied: false
  -> user traffic
```

The important point is that business hostnames no longer enter CloudFront through Cloudflare proxying. Cloudflare remains only on the `aws-origin.js.gripe` segment, where Tunnel carries CloudFront origin requests back to the origin server.

If a public response still contains `server: cloudflare` or `cf-ray`, that does not automatically mean the business hostname is Cloudflare-proxied. CloudFront reaches `aws-origin.js.gripe` through the Tunnel segment, so some origin-segment response headers can still show up.

## Two Ways To Organize Origins

There were two workable paths.

The first path avoids CloudFront Functions. Each business hostname gets a fixed intermediate origin name, and the CloudFront origin configuration statically injects `X-Origin-Host`.

The tested shape was:

```text
blog.js.gripe
  -> CloudFront distribution
  -> origin: blog-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: blog.js.gripe
  -> Cloudflare Tunnel
  -> 127.0.0.1:10480
  -> OpenResty origin proxy
```

`www.js.gripe` and the apex could be split the same way:

```text
www.js.gripe
  -> origin: www-js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: www.js.gripe

js.gripe
  -> origin: js-gripe.aws-origin.js.gripe
  -> custom header: X-Origin-Host: js.gripe
```

Tunnel ingress then becomes multiple hostnames:

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

The CloudFront origin config statically sets one custom header:

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

On the OpenResty side, this version does not need to recognize the `/_vhost/<host>` prefix, because CloudFront has no Function and does not rewrite the URI. The origin proxy only needs to read the real business hostname from `X-Origin-Host`, check it against a whitelist, and proxy the original path to the local HTTPS vhost:

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

Both `proxy_set_header Host` and `proxy_ssl_name` must point to `$origin_requested_host`. The former lets OpenResty enter the correct business `server_name`; the latter makes the local HTTPS hop use the matching SNI. Without both, a request may reach `127.0.0.1:443` but land in the default vhost or fail certificate validation.

This path is straightforward: no Function, no viewer-request URI rewrite, and no extra cache-key separation problem from putting many business hostnames behind one distribution. As long as one business hostname maps to one distribution, or at least to a clear origin/header pair, OpenResty can restore the real vhost from `X-Origin-Host`.

The limitation was not technical feasibility; it was plan quota. The CloudFront free or flat-rate plan only allowed a limited number of distributions, and at the time the practical ceiling was three. If we kept one distribution per business hostname, `blog.js.gripe`, `www.js.gripe`, and `js.gripe` would consume the whole allowance. There would be no room left for `dquery`, `searchme`, `cf-relay`, or other dynamic forwarding and cache-policy variants.

The second path keeps one unified origin. A CloudFront Function reads the viewer host, writes it to `X-Origin-Host`, and prefixes the URI with `/_vhost/<host>` for cache separation. This is the path I kept.

## Keeping A Single Tunnel Origin

The per-domain distribution approach is viable when the number of business hostnames stays within the plan limit and avoiding Functions is more important. I moved to a unified origin because the number of services under `js.gripe` would keep growing, and I did not want the fourth hostname to be blocked from CloudFront entirely.

The Tunnel side keeps only one name:

```text
aws-origin.js.gripe
```

Cloudflare Tunnel ingress only needs to send it to the local origin proxy:

```yaml
ingress:
  - hostname: aws-origin.js.gripe
    service: http://127.0.0.1:10480
  - service: http://127.0.0.1:10480
```

Business-host differences are no longer expressed through Tunnel hostnames. They are expressed through `X-Origin-Host` set by the CloudFront Function.

## Complete CloudFront Function

The CloudFront distribution uses one origin:

```text
Origin domain: aws-origin.js.gripe
Origin request policy: Managed-AllViewerExceptHostHeader
Cache policy: Managed-CachingOptimized
```

The key point is that the origin request policy does not forward the viewer `Host`. If `Host: blog.js.gripe` is sent directly to `aws-origin.js.gripe`, the CloudFront origin domain, TLS/SNI, Cloudflare Tunnel hostname, and OpenResty business host all get mixed together. I also tried changing `request.headers.host` inside a CloudFront Function, but CloudFront rejected that during validation. CloudFront Functions cannot modify `Host` that way.

So the Function runs at viewer request time and does four things:

- Checks the viewer host against an allowlist.
- Deletes viewer cookies so unnecessary cookies do not reach the origin or create huge header edge cases.
- Writes the viewer host into `X-Origin-Host`, so OpenResty can restore the real vhost.
- Prefixes the URI with `/_vhost/<host>` for cache separation, without double-prefixing.

A full viewer-request function looks like this:

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

The point is not to put complex business logic at the edge. It is to turn the viewer host, which CloudFront should not forward directly as `Host`, into an explicit controlled header. `delete request.headers.cookie` is optional, but useful for public sites: static assets, article pages, and most read-only APIs do not need viewer cookies, and clearing them reduces origin-request variance and the chance of oversized headers affecting the origin.

The `/_vhost/<host>` prefix must be paired with OpenResty. CloudFront sees the rewritten URI as the cache key, for example:

```text
/_vhost/blog.js.gripe/zh-CN/posts/cloudflare-tunnel-cloudfront-origin/
/_vhost/www.js.gripe/
/_vhost/dquery.js.gripe/dns-query/example
```

OpenResty strips the prefix and forwards the real path to the local HTTPS vhost. That keeps same-path resources from different business hostnames from polluting each other when they share one CloudFront distribution and the default cache policy.

## Restoring The Real Host In OpenResty

The local Tunnel entry listens on:

```text
127.0.0.1:10480
```

This layer is not the business site. It is an OpenResty origin proxy. It restores the business hostname from `X-Origin-Host`, checks a whitelist, removes the `/_vhost/<host>` prefix added by the CloudFront Function, and proxies to the local HTTPS vhost.

The core configuration is:

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

The whitelist matters. A unified origin without host validation easily becomes an open reverse proxy. The CloudFront Function keeps one allowlist, and OpenResty keeps another. Both layers stay in place.

## Cache And Invalidation Lessons

The default CloudFront cache policy is now `Managed-CachingOptimized`. Dynamic endpoints get their own behaviors by path; paths that need real-time origin responses can use a disabled-cache policy.

After the Function added the `/_vhost/<host>` prefix, cache separation became clearer, but invalidation required checking the actual cache key. I ran into this pattern:

- The article HTML was updated.
- `client.js` still returned an old version.
- CloudFront invalidation was already completed.
- Response headers still showed a Cloudflare cache hit from the origin segment.

The fix was to treat both cache layers together:

- Use `/*` for major CloudFront invalidations.
- Keep static asset query strings numeric, such as `?v=20260623`.
- Do not use explanatory query strings like `?v=20260623-debug` or `?v=20260603-test`.
- If the Cloudflare origin segment cached an old asset, purge it precisely or bump the asset version.

The article page now uses:

```html
<link rel="stylesheet" href="/assets/site.css?v=20260623">
<script src="/assets/client.js?v=20260623" defer></script>
```

## Debugging 502, 403, And Certificates

Errors in this chain need to be checked layer by layer.

For 502s, the usual checklist is:

1. Is the business hostname added to CloudFront aliases?
2. Does the ACM certificate cover that hostname, for example with `*.js.gripe`?
3. Is the CloudFront distribution deployed?
4. Is the CloudFront Function published to LIVE?
5. Does the Function allowlist include this host?
6. Does Cloudflare DNS point to `d2085p9k6hhzsj.cloudfront.net`, with the business hostname set to DNS-only?
7. Is `aws-origin.js.gripe` still a proxied Tunnel CNAME?
8. Does Tunnel ingress point to `http://127.0.0.1:10480`?
9. Does the OpenResty origin proxy whitelist include the host?
10. Does the local HTTPS vhost have the matching `server_name`?
11. Is the local vhost upstream port actually listening?

403s usually come from one of two places:

- The CloudFront Function rejects an unknown viewer host.
- The OpenResty origin proxy rejects an unknown `X-Origin-Host`.

Both 403s are intentional. They should not be replaced with a blanket allow rule just to make debugging easier.

Certificates exist in three layers:

- User-facing TLS is handled by CloudFront / ACM.
- `aws-origin.js.gripe` is handled on the Cloudflare Tunnel side.
- Local OpenResty vhosts use origin certificates.

For a new subdomain, confirm ACM coverage first, then add the CloudFront alias, then DNS, then update the Function and OpenResty whitelists.

## Recording Sensitive Values

This kind of migration touches many tokens, keys, account IDs, and certificate ARNs. Full values should not be pasted into an article.

My rule for notes is:

- Domains, public CNAMEs, and public policy names can be written in full.
- Cloudflare tokens, AWS access keys, and secret keys are not written in full.
- If a credential must be identified, expose only the first three and last three characters, with the middle masked, such as `cfu**********abc`.
- Database passwords, admin passwords, and hashes are also treated as sensitive. Even a hash is not written in full.

This article keeps only public domains, the public CloudFront distribution domain, and configuration structure. It does not record any full token or secret.

## Why I Kept This Design

Cloudflare SaaS binding is not useless. It simply did not solve the actual problem in this migration. I needed:

- User traffic to enter through CloudFront.
- The origin IP not to be directly resolved by the AWS origin side.
- Cloudflare to act only as a private origin path.
- OpenResty to keep routing by business `Host` across vhosts.
- Dynamic endpoints and static assets to use different cache policies.
- Low-trust public paths not to hold core secrets.

The memecdn / myzerossl lesson was to avoid giving low-trust nodes more responsibility than they need. Cloudflare Tunnel fits that idea on the origin path: it only brings CloudFront requests back inside, while OpenResty still decides business routing.

This is more complex than "put the origin behind Cloudflare" and more complex than "let CloudFront hit a public origin IP." The added complexity buys a clearer boundary: CloudFront owns the public edge, Tunnel owns private origin access, and OpenResty owns virtual-host routing.
