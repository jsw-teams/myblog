---
title: "From Building My Own Search Engine to Giving Up"
description: "A SearchMe postmortem: starting with SearXNG, trying weighted ranking, in-memory writes, local_index, then Apache Nutch, and finally returning to the SearXNG setup now used by search.js.gripe."
date: "2026-05-31"
updated: "2026-05-31"
translationKey: "searchme-search-engine-from-start-to-give-up"
tags: ["SearchMe", "SearXNG", "Nutch", "Search Engine"]
category: "Search Services"
draft: false
cover: ""
---

This post could have been called "How to Build Your Own Search Engine Gracefully." By the end, the most graceful part turned out to be knowing when to stop.

`searchme` had a modest goal: provide a search entry point for daily research, news material, literature searches, and video-script preparation. It was never trying to clone Google, and it was definitely not pretending that one small server could swallow the entire web. The goal was simply to make `search.js.gripe` usable, controllable, and not wildly misleading.

But search has a way of growing teeth. You think you are building an input box. Then you realize you are designing an information worldview.

**Current live entry point:** `search.js.gripe` is running normally at <https://search.js.gripe/>. At the moment, it is intentionally close to a stock SearXNG deployment, with JSON results enabled so users, scripts, and well-behaved LLMs can read structured search output.

The simplest beginner workflow is: search normally in the browser first. If you want a web-enabled LLM to fetch structured results, put the query into this URL shape:

```text
https://search.js.gripe/search?q=your search terms&format=json
```

For example:

```text
https://search.js.gripe/search?q=SearchMe%20SearXNG&format=json
```

Then you can ask an LLM:

```text
Please open this JSON search result, compare the relevance of the first few links, and tell me which results are worth opening next:
https://search.js.gripe/search?q=SearchMe%20SearXNG&format=json
```

If your query contains spaces or non-English text, the browser usually encodes it for you. When in doubt, search on `search.js.gripe` first, then adapt the address so it includes `format=json`.

<!--more-->

## Starting With SearXNG

The first plan was straightforward: [SearXNG](https://github.com/searxng/searxng) is a mature self-hosted metasearch project, so it made sense to use it as the base. It can aggregate multiple upstream search engines, it is reasonably easy to deploy, and it fits the shape of a self-hosted search portal.

The first phase of `searchme` wrapped SearXNG with a frontend, API, search modes, caching, result cleanup, deduplication, and ranking rules tuned for my own workflows.

The public [jsw-teams/searchme](https://github.com/jsw-teams/searchme) project currently describes SearXNG as a rough-discovery component: it brings back candidates, but it should not be treated as the final quality layer. In other words, SearXNG is a good net. You still have to sort what the net catches.

That is where the trouble started.

## The Results Were Not Just Messy

At first we thought search quality was mostly a ranking problem. Later it became clear that ranking is only the last layer of politeness. The candidate set can already be chaotic before ranking ever begins.

The aggregated and crawled results included all kinds of surprises:

- titles that looked relevant while the body was barely related;
- query terms appearing only in navigation, footers, or recommendation widgets;
- the same article copied, reposted, syndicated, and repackaged across sites;
- short links, redirect pages, login pages, and portal pages mixed into normal results;
- pages that were already 404 but still appeared through stale cache traces or old upstream signals.

That is when "can find something" starts to feel very different from "found the right thing." The hard part of search is not returning ten links. It is returning ten links without quietly sneaking in a few that look like answers and then waste your afternoon.

## First Rescue Attempt: Ranking, Memory, And local_index

Since the results from SearXNG were not stable enough, `searchme` got an extra layer of local judgment.

That phase included several experiments:

1. Weighted ranking: score results by language, domain, source trust, page type, short-link risk, and official-site intent.
2. In-memory writes: keep local memory of results that had been seen, judged, or found useful or useless.
3. `local_index`: cache and recall content from pages that had already been fetched, so future searches would not depend only on upstream titles and snippets.
4. Deduplication and filtering: normalize URLs, merge repeated pages, and lower the rank of low-value sites, repost farms, and redirect pages.

None of this was wrong. It did improve some frequent searches, and it helped official sites, media organizations, government agencies, and brand homepages surface more reliably for navigational queries.

But the improvement was limited.

The reason is plain: if the candidate set does not include the page that actually matters, local reranking can only choose the least bad result from a weak set. `local_index` has the same constraint. It can only recall pages that were fetched, stored, and parsed. Pages outside local visibility still do not exist.

So the next step felt obvious: crawl the web ourselves.

## Second Rescue Attempt: Apache Nutch

When self-hosted search reaches the crawler stage, [apache/nutch](https://github.com/apache/nutch) is hard to ignore. Nutch is a long-running open-source crawler project that handles seed URLs, fetching, parsing, link discovery, CrawlDB, and index writing. It looked like a reasonable way to add a local web-discovery layer to `searchme`.

The experiment looked roughly like this:

- prepare seed sites, including government, media, search portals, brands, and academic sites;
- use Nutch to start crawling from those seed URLs;
- parse page text with HTML/Tika;
- follow links to discover new pages;
- write results into Solr, Kafka, or an archive flow;
- query the local index from `searchme`, then merge and rerank those results with SearXNG candidates.

The configuration was intentionally polite: single-host crawling, limited per-host concurrency, fetch delays, content-size limits, and filters for common static assets and login pages. The point was to avoid turning the machine into a tiny rude crawler with a lot of opinions.

In theory, this could solve SearXNG's recall problem. In practice, it revealed a different truth: running a crawler does not mean the internet walks into your database.

## Nutch Is Strong, But It Does Not Know The World By Magic

Nutch is honest. Give it seeds and it starts from those seeds. If a page links out, it can follow the link. If there is no link, Nutch does not magically know the outside world exists.

That makes it naturally good at crawling "known lists" and "the world linked from known lists." If a new site is not in the seed set and is not linked from something already crawled, it will not appear out of nowhere.

Modern websites add another layer of friction:

- some depend on JavaScript rendering, so a plain fetch does not get useful body text;
- some require cookies, location, login state, or captchas;
- some reject unknown crawlers with robots rules, WAFs, or rate limits;
- some only make room for verified major crawlers;
- some can be fetched, but the result is mostly templates, recommendation feeds, ad slots, and unrelated links.

At that point, the phrase "self-hosted search engine" starts to feel light word by word, but heavy as a whole.

A mature search engine is not just a crawler plus an index. It needs crawl scheduling, spam resistance, text extraction, language detection, duplicate detection, link graphs, site quality signals, freshness logic, legal and robots compliance, resource budgets, retry behavior, and the hardest part: a sense of what deserves to be seen.

## Why It Returned To SearXNG

`search.js.gripe` eventually returned to SearXNG, but not because SearXNG had been transformed into a brilliant search engine. Quite the opposite: the current production setup is basically a one-click, unmodified SearXNG deployment.

That is anticlimactic, but honest.

The crawler path requires long-term maintenance for fetching, parsing, indexing, scheduling, and abuse resistance. The local reranking path still runs into candidate-quality limits. By comparison, upstream SearXNG is stable, lightweight, replaceable, and does not instantly turn maintenance into a full-time job.

The main adjustment is not changing the search core. It is making the service friendlier to tools and LLMs: public JSON access is available so well-behaved automation can consume structured results instead of scraping HTML.

Public access does not mean unlimited access. Clients that do not respect site boundaries, crawl aggressively, or try to route around normal access expectations still need limits. Claude-like clients whose crawling ethics are difficult to trust should not automatically receive the same convenience as well-behaved tools.

The screenshot below is a fairly typical scene: asking others to respect boundaries while crawling with little restraint yourself. Put plainly, there is a real shamelessness to it.

![Screenshot of unwelcome crawling behavior](https://files.js.gripe/files/raw/fil_AFcHWSmTpO_GAPUQE6LPXm7A.png)

So the current line is not "we successfully built a search engine." It is closer to: "let SearXNG handle the search core, and maintain a public, controllable, LLM-friendly search entrance."

## Codex's Suggestion, And Why I Am Not Doing It Yet

This is where a suggestion from Codex belongs.

Codex suggested that if SearXNG quality is uneven but still useful as a candidate source, the better path is not to keep modifying SearXNG itself. Instead, add a thin `searchme` JSON gateway around it.

That gateway could keep SearXNG untouched while adding structured output, caching, rate limits, client policy, and lightweight URL status hints. For example, it could return title, URL, snippet, source, time, language, fetch status, possible redirect-page hints, and possible unreachability hints for LLMs. It could also check a small number of 404s asynchronously, or keep successfully fetched pages as local memory.

From an engineering standpoint, the suggestion makes sense: SearXNG continues to "search a bit," while `searchme` makes the results easier for LLMs to read. If Nutch, StormCrawler, Common Crawl, RSS, or sitemaps are added later, they can become additional candidate sources without overturning the whole system again.

But I am not planning to add filtering for now.

The reason is simple: filtering, downranking, and local reranking have already been tried, and the result was often that the search results were almost filtered out of existence. The page looked cleaner, but useful information disappeared with the junk. Low search quality is one problem; deciding too early what users should not see can become another.

For now, I would rather keep an LLM-friendly but imperfect environment. The results can be messy, noisy, and uneven. Let users and LLMs touch them first, then judge, compare, ask follow-up questions, and exclude results on their own.

It is a little like the problem of open networks. Someone is always worried that users might encounter an imperfect information environment, so the instinct is to close, filter, and block on their behalf. But people will eventually encounter complex information anyway, and they will try to understand it in their own ways. That process may not be elegant. It may even be clumsy. But taking the first step is still worth something.

So at this stage, `search.js.gripe` is not trying to make the final judgment for users. It provides a public, structured, LLM-friendly entrance. Whether a result is good, which link is trustworthy, and what deserves follow-up is handed back to users and LLMs.

## What "Giving Up" Really Means

In this story, "from building my own search engine to giving up" does not mean giving up on the search service. It means giving up a tempting misunderstanding:

> If you have an open-source crawler, an index, and a search box, you have your own search engine.

The more realistic conclusion is this:

Small teams and personal sites are better suited to building search entrances and open interfaces than carrying whole-web search infrastructure. Run SearXNG first, expose JSON first, and hand judgment back to users and LLMs. Under the current resource constraints, that is the better tradeoff.

It is less exciting than "I crawled the whole internet myself," but it is much more likely to survive.

And in technical projects, surviving is sometimes its own kind of advanced relevance ranking.
