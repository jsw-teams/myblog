---
title: "How We Built the dquery Recursive Resolver"
description: "A practical write-up on dquery: plaintext DNS, recursive resolution, ccTLD governance, DNS pollution, local rules, blocking, and normalized caching."
date: "2026-06-15"
updated: "2026-06-15"
translationKey: "building-doh-resolver"
tags: ["DNS", "DoH", "dquery", "Resolver", "Network Services"]
category: "Technical Practice"
draft: false
---

DNS looks like one of the simplest parts of the Internet: give it a name, get back an address.

The “Internet phone book” metaphor is useful, but incomplete. DNS usually happens out of sight: opening a website, launching an app, syncing mail, calling an API, or fetching an update can all begin with the same quiet question: “Where does this name point?”

If that question travels in plaintext, devices on the path may see it. If the resolver has its own policy, it may change the answer. If caching is implemented carelessly, a resolver may even return a DNS message that is fast but not protocol-correct.

dquery is still in small-scale testing and active development, so this article does not publish any service address, resolver path, query endpoint, or public onboarding instructions. Instead, it records the engineering boundaries we had to draw while building a self-hosted recursive resolver: anonymous lookup, personal profiles, console management, local rules, DoH caching, regional policy, and protocol correctness.

<!--more-->

## Why DNS Became A Trust Problem

Traditional DNS mostly runs over UDP/53. It is simple, fast, and compatible, which is why it has remained a core Internet component for decades. But it was designed early, without encryption by default and without strong protection against observation or tampering along the path.

In some networks, DNS queries can be observed by access providers, public Wi-Fi, gateways, middleboxes, or other path observers. In worse cases, an attacker or policy device can race the real answer and return a forged one first.

DoT, DoH, and DoQ are all attempts to repair that historical weakness:

- DoT puts DNS inside TLS with a clear protocol boundary.
- DoH puts DNS inside HTTPS and fits naturally into browser and CDN ecosystems.
- DoQ puts DNS over QUIC for encrypted transport, lower latency, and connection migration.
- ODoH goes further by separating “who is asking” from “what is being asked.”

But encrypted DNS is often misunderstood as complete anonymity. It is not. DoH mainly protects the path between the client and the resolver. The resolver still has to see the question in order to answer it: the name, record type, rough source context, matching rules, and chosen upstream.

So DoH does not eliminate DNS trust. It moves trust from every network device on the path to the resolver you choose. The value of a self-hosted resolver is that logging, upstream choice, cache behavior, blocking rules, and regional policy can be made explicit and explainable.

## Separate The Layers First

DNS discussions often mix together root servers, ccTLD governance, recursive resolvers, ISP hijacking, public DNS, and encrypted DNS. They are related, but not the same layer.

Root servers tell recursive resolvers where to find top-level domains such as `.com`, `.cn`, `.iq`, or `.ly`. They do not answer the final IP address for every website. Day-to-day users are more likely to interact with local caches, routers, ISP resolvers, public DNS, DoH resolvers, and authoritative DNS servers.

Root system resilience and neutrality of everyday recursive answers are related questions, but they are not the same question.

### Put Root Server Claims Back Into The Right Layer

An old claim in Chinese-language Internet debates says that China has no root servers, so the domain system could fail overnight under foreign pressure. There is historical context behind that claim, but the wording is too coarse.

More precisely, the DNS root server system has 13 root server identifiers, from A-root to M-root, operated by multiple independent organizations. These logical identities are deployed globally through anycast instances. That leads to at least four different concepts:

- Root identifier operation: who operates one of the logical A-root to M-root identities.
- Root server instance: a deployed anycast node for one of those identities.
- ccTLD governance: who runs `.cn`, `.iq`, `.ly`, and their authoritative DNS.
- Recursive resolution path: which resolver, cache, upstream, and network path an ordinary user actually uses.

When these layers are mixed together, “no root identifier operation” becomes “no root servers,” ccTLD governance issues become “root servers can erase a country,” and path-level pollution becomes “the root zone was rewritten.” That sounds dramatic, but it is technically inaccurate.

The Iraqi `.iq` and Libyan `.ly` cases are better understood as ccTLD governance, authoritative DNS, technical contact, and operational-continuity problems. They are useful reminders that ccTLD governance matters, but they should not be compressed into “root servers can erase a country.” The fuller discussion of root-zone governance, ICANN, legal jurisdiction, and network sovereignty belongs later in the afterword.

### DNS Answers Are Not Always Neutral

Many people imagine DNS as a dictionary: the answer is simply what the dictionary says. Real DNS paths are longer than that, and answers can be changed at different layers.

The change is not always political censorship. It may come from business policy, security products, parental controls, enterprise policy, malicious hijacking, or misconfiguration.

In 2003, VeriSign launched Site Finder. When users queried nonexistent `.com` or `.net` names, normal DNS semantics should have returned “name does not exist.” Site Finder redirected those names to a search page instead. That may look harmless in a browser, but it changes the meaning of NXDOMAIN for mail systems, anti-spam rules, automation, and network devices.

In 2014, during the Twitter and YouTube blocking in Turkey, many users switched to Google Public DNS. Google later said local networks had deployed servers impersonating Google DNS in order to block those services. Public DNS is not a magic switch: if the path can be intercepted, DNS can still be blocked, spoofed, or redirected.

GFWatch’s long-term measurement of DNS filtering in mainland China provides another useful reference. The USENIX Security 2021 paper “How Great is the Great Firewall? Measuring China’s DNS Censorship” describes large-scale DNS filtering measurement, injected forged records, and polluted records appearing in some public resolver caches.

For dquery, the lesson is not to turn every DNS story into a political slogan. The practical lesson is that DNS answers can be shaped by the path, the upstream, local policy, and caches. A resolver should make those sources as distinguishable as possible.

## We Do Not Want Another Black Box

A public DNS service that returns answers without explaining where they came from can easily become another black box.

dquery’s goal is not to be a mysterious “universal DNS.” The goal is to split resolution into explainable stages.

```text
Client request
  -> Entry classification: anonymous, personal, or console
  -> Regional and account policy
  -> Local domain rules
  -> Normalized cache
  -> Upstream recursive resolution
  -> DNS response
```

This gives each result a source:

- If a name is blocked by user rules, the resolver should say it was a local rule hit.
- If a name returns NXDOMAIN, the resolver should distinguish upstream NXDOMAIN from local policy NXDOMAIN.
- If an anonymous entry is unavailable because of regional policy, it should return an explicit HTTP status instead of pretending to be broken.
- If an answer comes from cache, the DNS message must still be protocol-correct.

Those details decide whether a resolver can be trusted.

## Local Rules: Not Every Name Needs Upstream

A resolver does not have to be a passive pipe to upstream DNS. Before dquery goes upstream, it checks the user profile and rule sets.

If a name matches local policy, the resolver may:

- allow it and continue upstream;
- return NXDOMAIN;
- return an address for a block page;
- return a policy error explaining that rules or regional policy applied.

This has three practical benefits.

First, it reduces unnecessary upstream queries. If a domain is already in a user’s block list, sending it to a third-party resolver adds latency and leaks data without much value.

Second, locally handled blocked domains do not leak to upstream DNS.

Third, it allows per-user policy. One user may block only malware. Another may also block ads and tracking. Another may prefer a nearly raw resolver. A single global policy cannot satisfy all of those needs.

The important rule is restraint. A resolver should not silently rewrite answers and then pretend they came from authoritative DNS. Local handling should be visible in logs, console state, or other observability surfaces.

## Regional Policy: Explicit Refusal Is Better Than Fake Failure

Public DNS services also face compliance and abuse risks.

Some regions impose different expectations on public resolvers, encrypted DNS, or services that can bypass local resolution policy. If an anonymous DoH entry is widely abused, the operational risk lands on the service provider.

So dquery separates surfaces:

- Front-end lookup page: a web tool that should remain broadly available.
- Anonymous resolver entry: minimal public capability, but eligible for regional refusal.
- Personal resolver entry: tied to account, profile, rules, quota, and long-term usage.
- Console entry: rule management, status, and personal resolver configuration.

When an anonymous entry is unavailable in a region, we prefer HTTP 451 over vague 403, 502, or timeout behavior. HTTP 451 means “Unavailable For Legal Reasons.” It tells the user the service is not broken; this entry simply cannot be delivered under current conditions.

This especially includes mainland China. The reason is not technical impossibility. The compliance cost and governance risk are too high. A public recursive resolver offered into mainland China can easily be pulled into local governance: log retention, abuse handling, domain handling, and even policy answers for specific names. For large public DNS providers, that may be described as compliant operation. For us, it would shift a resolver from “explain where answers came from” toward “cooperate in rewriting answers at the source.”

That is why dquery does not currently provide resolver service to mainland China. If a resolver must become a non-neutral upstream in order to enter a market, it is no longer merely protecting the client-to-resolver path; it is creating another layer of pollution at the recursive source. Some domestic public resolvers returning policy-shaped answers for specific domains are close to this problem: encryption protects the path to the resolver, but it does not prove the resolver itself is neutral.

The 2010 I-root China node incident is a useful analogy. Some overseas networks received abnormal DNS answers because routing, anycast, and local DNS policy interacted. Public reporting later said the Chinese node’s route announcements were withdrawn to prevent further spread. This was not “root servers erasing a country.” It showed that local DNS policy, anycast nodes, and BGP routing can make local pollution or bad answers leak outward.

This is not a perfect answer, but it is more honest than silence.

## The Hard Part Of Caching: DNS ID

DNS is high-frequency traffic. Without caching, origin pressure and latency rise quickly. But DNS cannot be cached like ordinary web pages, because DNS messages have protocol details.

One key field is the Transaction ID: the first 16 bits of a DNS message. RFC 1035 defines the DNS header and its ID field. A client usually generates an ID for a query, and the response must carry that same ID so the client can match answer to request.

DoH GET requests encode the DNS wire message into an HTTP request. RFC 8484 defines that form. If two clients ask the same name and record type but use different DNS IDs, the encoded request differs. A CDN sees different HTTP objects and treats them as separate cache entries.

RFC 8484 is aware of this and recommends ID=0 in cache-friendly situations. In practice, a server cannot assume all clients behave that way.

The server has to handle it.

## Why Not Put All Normalization At The Edge

At first, we considered doing normalization in an edge script: parse the DNS message, remove the DNS ID from the cache key, and restore the current request’s ID on cache hit.

That is valid at the protocol level and improves hit rate. But DNS volume is high. If every personal resolver request goes through edge script execution, request count and cost become major problems.

The final design moved core protocol handling back to the backend. The backend removes DNS ID from the cache key, but preserves every semantic dimension that can change the answer:

- queried name;
- record type, such as A, AAAA, HTTPS, TXT;
- class, usually IN;
- DNS flags that affect the result;
- ECS or other answer-shaping extensions;
- current profile;
- local rule version;
- regional policy;
- selected upstream or route.

This avoids mixing results across users, regions, rules, or upstreams.

When the cache hits, the backend rewrites the response’s first two bytes back to the current request’s DNS ID. The answer content is shared, but the protocol match remains correct.

That small step is the core of the cache design: improve hit rate without breaking DNS request-response matching.

## What Reverse Proxies And CDNs Should Do

Reverse proxies are good for TLS termination, routing, rate limiting, and ordinary HTTP proxying. They are not a good place to do the core binary rewrite for DoH responses.

DoH responses are DNS wire messages. Even on cache hit, the first two bytes may need to be rewritten per request. Doing that in a reverse proxy body filter increases copying and CPU cost and makes concurrency bugs harder to reason about.

So the responsibility split is:

```text
Client DoH request
  -> CDN or edge network
  -> Reverse proxy routing
  -> Backend parses DNS message
  -> Backend builds a cache key without Transaction ID
  -> Backend restores the current response ID after HIT
  -> Protocol-correct DNS response
```

CDN still matters, but it should not need to understand DNS wire messages. It is best used as a second-layer cache for responses the origin explicitly marks as shareable.

So the origin uses `Cache-Control` to express intent:

```text
Origin MISS or BYPASS:
Cache-Control: no-store

Origin HIT or STALE:
Cache-Control: public, max-age=..., s-maxage=...
```

The first uncached request is not stored by CDN. Once the origin has confirmed the answer can be safely shared, CDN may cache that HTTP object. CDN follows HTTP cache semantics; it does not rewrite DNS messages.

## Why Personal Resolver Entries Matter

Anonymous entries are useful for basic lookup, but they should not carry every feature. A personal resolver entry is not just another address; it binds resolution behavior to a profile.

Anonymous usage can remain minimal: standard queries, basic limits, and regional refusal when necessary.

Personal usage can support:

- user-defined rules;
- different profiles per device;
- separate policies for home, mobile, and servers;
- query statistics and anomaly observation;
- quotas, rate limits, and abuse control;
- future account-system or SSO integration.

This is clearer than forcing everyone through one global policy. When resolution looks wrong, we can ask: anonymous limit, personal rule, upstream failure, cache hit, regional policy, or client request format?

The personal entry and console are still being improved, so this article intentionally discusses design boundaries and tradeoffs without publishing service paths or onboarding details.

## What DoH Protects And What It Does Not

Can a DNS provider still see hostnames if you use DoH?

Yes.

DoH encrypts transport from client to resolver. It helps prevent path observation and tampering, but the resolver must decrypt the query to answer it.

DoH helps with:

- reducing DNS visibility on public Wi-Fi and middle networks;
- making ordinary DNS hijacking and race-injection harder;
- allowing browsers, systems, and apps to use HTTPS infrastructure for DNS;
- letting users choose a resolver instead of defaulting to the access network.

DoH does not guarantee:

- that the resolver operator cannot see what you query;
- that upstream answers are neutral;
- that all censorship or blocking disappears;
- that IP layer, SNI, or traffic fingerprints are hidden;
- that caching, logging, and account systems create no new privacy risk.

That is why resolver transparency matters. Instead of promising “absolute privacy,” say which segment is protected, what is logged, what is not logged, what came from local rules, and what came from upstream.

## Afterword: Root Servers, ICANN, And “Network Hegemony”

In Chinese-language DNS debates, one sometimes sees claims such as “whoever controls root servers controls the lifeline of the Internet” or “the United States can erase certain websites from the Earth.” The 2021 discussion around 36 Iran-related websites seized by the United States is often pulled into this framing.

There is a real issue underneath: when a domain registrar, registry, hosting provider, CDN, or payment compliance provider is under a certain legal jurisdiction, court orders and sanctions can affect domains and services. But technically, translating that directly into “the United States used root servers to erase websites with one button” is an oversimplification.

The 2021 case is more accurately described as a U.S. Justice Department seizure of specific domain names under court orders. It affected those domains’ registration and resolution services. It did not remove Iran’s `.ir` country-code top-level domain from the root zone, nor did ICANN reclaim a country-code TLD. Some affected outlets later continued online using `.ir` domains, which is a good clue: the event happened mainly at the specific-domain and legal-jurisdiction layer, not at the layer of removing an entire ccTLD from the public root.

It helps to split the layers:

```text
Individual domain seizure:
  A specific .com domain is locked, redirected, or taken over by a registrar,
  registry, or court order.

TLD delegation change:
  The root zone changes delegation data such as NS, DS, or glue records for a TLD.

ccTLD governance issue:
  A country-code TLD has problems with registry operation, authoritative DNS,
  technical contacts, or local governance process.

Root server instance:
  An anycast node deployed around the world, serving the same root-zone data.

Recursive resolution path:
  The ISP resolver, public DNS resolver, DoH resolver, and caches actually used
  by ordinary users.
```

If only a specific domain is seized, the root zone usually does not need to change, and the TLD authoritative servers continue to work. Users may see that domain redirected to a seizure page, fail to resolve, or become locked, while other names under the same TLD remain unaffected.

If a TLD-level redelegation really happens, then the root zone is involved. For example, if the manager of a ccTLD changes, the NS, DS, and glue records in the root zone are updated. Root server instances then serve the updated root-zone data. Once recursive resolver caches expire, resolvers follow the new delegation to the new TLD authoritative servers. Old authoritative servers may still run, but they are no longer part of the standard public DNS path.

If a ccTLD is retired and eventually removed from the root zone, the effect is clearer: the public root no longer tells recursive resolvers where to ask for that TLD. Old authoritative servers can technically keep answering direct queries, but ordinary public DNS resolution will not naturally reach them. Unless a network uses an alternate root, a private root, or pinned old data, that TLD is no longer part of the globally consistent public namespace.

So the attitude toward IANA and ICANN does not need to swing between two extremes. They should not be portrayed as a pure technical utopia with no historical baggage. They also should not be portrayed as a button that one country can casually press to turn off the Internet. A more accurate view is that the public DNS root zone is a global coordination mechanism with history, political controversy, public processes, accountability mechanisms, and community participation.

After the IANA stewardship transition completed in 2016, the U.S. government’s IANA functions contract with ICANN ended. ICANN now operates through a multistakeholder model in which governments, ccTLD communities, technical communities, registrars, registries, commercial and noncommercial users, and end users participate through different organizations and committees. ICANN also has accountability mechanisms such as Reconsideration, Independent Review Process, Ombudsman, and the Empowered Community. None of this proves the system is perfect, but it does show that public root-zone governance is not a one-way command chain.

If someone asks whether IANA or ICANN material is trustworthy, the better answer is not “trust the institution.” It is to make the claim verifiable: root-zone registrations can be checked, the root-zone file can be downloaded, root servers can be measured from different networks, DNSSEC can validate the chain of trust, ccTLD redelegation and retirement procedures are public, and third-party academic measurements and operator observations can cross-check the picture.

Reasonable “independence” should be more about resilience and governance participation: building local recursive capability, deploying root server instances, maintaining caches, validating DNSSEC, operating incident-response and measurement systems, and participating in ICANN, IETF, RIR, ccNSO, and GAC processes. Those things improve resilience. By contrast, a root system incompatible with the public root would make the same name point to different answers in different networks, damaging one of the Internet’s most important properties: roughly the same public namespace everywhere.

Those “network hegemony” articles can still be useful reminders that domain names are affected by law, sanctions, registrars, registries, and international governance. They just should not be read as “root servers can shut down the Internet with one click.” For a DoH resolver, the more important task is neither repeating conspiracy theories nor pretending DNS is perfectly neutral. It is to explain where an answer came from: root-zone delegation, TLD authority, upstream recursion, local rules, cache hits, regional policy, seizure, blocking, or pollution.

## Afterword: DNS Transport Methods Will Keep Changing

DNS transport has been moving from “trust the network by default” toward “minimize exposed surfaces.”

UDP/53 is fast, but exposes queries to the path. DoT encrypts DNS with a clear transport boundary. DoH rides on HTTPS and fits browsers and CDNs, but concentrates trust in the resolver. DoQ uses QUIC to improve latency and connection behavior. ODoH separates client identity from query content so that no single party has to see both.

ODoH is not free. It adds latency, proxy availability concerns, key distribution, deployment complexity, and the question of whether proxy and target resolver collude. It is a longer-term direction, not the first thing to force into the core path.

For dquery’s current stage, the realistic goal is to make ordinary DoH correct: clear entries, transparent rules, safe caching, explicit regional policy, and reliable protocol behavior.

## Current State

After this rebuild, dquery’s boundaries are clearer:

- anonymous and personal entries are separate;
- local rules can handle domains before upstream recursion;
- regional policy is expressed explicitly instead of disguised as failure;
- edge scripts no longer carry high-frequency core protocol handling;
- the backend normalizes DNS ID and restores the current response ID on hit;
- cache keys exclude DNS ID but keep answer-shaping semantics;
- CDN only caches responses the origin marks shareable;
- ODoH remains a possible future direction.

DNS service is easy to build as a small program that “returns answers.” The hard part is admitting that it sits between privacy, performance, compliance, protocol correctness, user rules, upstream trust, and Internet governance history.

A good resolver should not only be fast. It should be able to explain itself: why it resolved, why it refused, why it blocked, why it returned 451, why it hit cache, and why the cached response is still a correct DNS response.

That is what this rebuild was really about.

## References

- [RFC 1035: Domain Names - Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035)
- [RFC 7858: DNS over TLS](https://www.rfc-editor.org/rfc/rfc7858)
- [RFC 8484: DNS Queries over HTTPS](https://www.rfc-editor.org/rfc/rfc8484)
- [RFC 9250: DNS over Dedicated QUIC Connections](https://www.rfc-editor.org/rfc/rfc9250)
- [RFC 9230: Oblivious DNS over HTTPS](https://www.rfc-editor.org/rfc/rfc9230)
- [RFC 7725: An HTTP Status Code to Report Legal Obstacles](https://www.rfc-editor.org/rfc/rfc7725)
- [IANA Root Servers](https://www.iana.org/domains/root/servers)
- [IANA Root Zone Files](https://www.iana.org/domains/root/files)
- [Root Server Technical Operations Association](https://root-servers.org/)
- [IANA Delegation Record for .IQ](https://www.iana.org/domains/root/db/iq.html)
- [IANA Delegation Record for .LY](https://www.iana.org/domains/root/db/ly.html)
- [Reuters: U.S. seizes websites tied to Iranian disinformation](https://www.reuters.com/world/middle-east/us-seizes-websites-tied-iranian-disinformation-us-officials-say-2021-06-22/)
- [ICANN: Stewardship of IANA Functions Transitions to Global Internet Community](https://www.icann.org/en/announcements/details/stewardship-of-iana-functions-transitions-to-global-internet-community-as-contract-with-us-government-ends-1-10-2016-en)
- [ICANN Accountability Mechanisms](https://www.icann.org/resources/pages/accountability-mechanisms-2012-02-25-en)
- [The Rambling Firewall of China](https://www.wired.com/2010/03/the-rambling-firewall-of-china/)
- [VeriSign to Shut Down Site Finder](https://www.wired.com/2003/10/verisign-to-shut-down-site-finder/)
- [Google Public DNS: Censorship in Turkey](https://en.wikipedia.org/wiki/Google_Public_DNS#Censorship_in_Turkey)
- [How Great is the Great Firewall? Measuring China's DNS Censorship](https://arxiv.org/abs/2106.02167)
- [MDN: Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
