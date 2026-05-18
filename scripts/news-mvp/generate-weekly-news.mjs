#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatTaipeiWeekLabel, getPreviousTaipeiWeek } from "./lib/taipei-week.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcesPath = path.join(rootDir, "config/news-mvp.sources.json");
const assetsPath = process.env.MYFILES_ASSET_MANIFEST
  ? path.join(rootDir, process.env.MYFILES_ASSET_MANIFEST)
  : path.join(rootDir, "config/news-mvp.assets.json");

function jsonString(value) {
  return JSON.stringify(value);
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function renderSourceList(sources) {
  return sources.map((source) => `- ${source.name}: ${source.url}`).join("\n");
}

function renderHighlights(items) {
  return items
    .map((item) => {
      const sourceNames = item.sources.map((source) => source.name).join("、");
      return `### ${item.title}\n\n${item.summary}\n\n复核入口：${sourceNames}`;
    })
    .join("\n\n");
}

function renderVoiceover(items, weekLabel) {
  const lines = [
    `本期周报覆盖台北时间 ${weekLabel}。以下内容仍处于草稿阶段，发布前需要人工核对事实、措辞和素材授权。`,
    ...items.map((item) => item.voiceover),
    "以上是本周国际新闻草稿版。发布前请以原始英文来源、国际机构和政府一手资料为准。",
  ];

  return lines.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

function renderTimeline(items) {
  return items.map((item) => `- ${item.date}: ${item.timeline}`).join("\n");
}

function renderAssetKeywords(items) {
  return items.map((item) => `- ${item.title}: ${item.assetKeywords.join("；")}`).join("\n");
}

function renderAttachmentManifest(assets, publicBase) {
  const images = Array.isArray(assets.images) ? assets.images : [];
  return [
    `- publicBase: ${publicBase}`,
    `- cover: ${assets.cover || `${publicBase}/f/news-mvp/cover.webp`}`,
    `- video: ${assets.video || `${publicBase}/f/news-mvp/weekly-world-news.mp4`}`,
    "- images:",
    ...(images.length ? images.map((image) => `  - ${image}`) : [`  - ${publicBase}/f/news-mvp/placeholder.webp`]),
  ].join("\n");
}

function fallbackBrief(week, sourceConfig) {
  return {
    title: `国际新闻周报：${formatTaipeiWeekLabel(week)}`,
    description: "面向人工复核的国际新闻周报草稿，包含中文报告、视频旁白、时间线、素材关键词、英文来源列表与 myfiles 附件占位。",
    items: sourceConfig.defaultTopics.map((topic) => ({
      date: week.startDate,
      title: topic.title,
      summary: topic.summary,
      voiceover: topic.voiceover,
      timeline: `${topic.title}：待编辑根据本周原始来源补充关键节点。`,
      assetKeywords: topic.assetKeywords,
      sources: sourceConfig.sources.filter((source) => topic.sourceIds.includes(source.id)),
    })),
  };
}

function renderPost({ week, brief, assets, publicBase, sources }) {
  const weekLabel = formatTaipeiWeekLabel(week);
  const allSources = brief.items.flatMap((item) => item.sources);
  const uniqueSources = [...new Map([...allSources, ...sources].map((source) => [source.url, source])).values()];

  return `---
title: ${jsonString(brief.title)}
description: ${jsonString(brief.description)}
date: ${jsonString(week.generatedDate)}
updated: ${jsonString(week.generatedDate)}
translationKey: ${jsonString(week.slug)}
author: "Codex 观澜"
tags: ["Codex 观澜", "国际媒体观察", "Weekly News"]
category: "Codex 观澜周报"
draft: true
cover: ${jsonString(assets.cover || "")}
---

这是一篇由 Weekly News MVP 生成的草稿，归档区间为台北时间 ${weekLabel}。内容用于人工编辑、事实核查和视频制作排期；发布前请逐条复核英文来源、机构原文、图片/视频授权与 myfiles 附件状态。

署名：Codex 观澜。

<!--more-->

## 本周范围

- 时区：${week.timeZone}
- 起止：${weekLabel}
- 生成日期：${week.generatedDate}
- Manifest key：${week.key}

## 中文报告

${renderHighlights(brief.items)}

## 视频旁白稿

${renderVoiceover(brief.items, weekLabel)}

## 时间线

${renderTimeline(brief.items)}

## 素材关键词清单

${renderAssetKeywords(brief.items)}

## myfiles 附件占位

${renderAttachmentManifest(assets, publicBase)}

## 英文来源列表

${renderSourceList(uniqueSources)}

## 编辑复核清单

- 核对每条新闻是否落在台北时间 ${weekLabel}。
- 优先使用英文报道、国际机构、政府一手资料；中国官方媒体仅作辅助交叉验证。
- 不直接搬运未授权图片或视频，素材只保留关键词或 myfiles 已托管链接。
- 确认封面、视频、图片附件是否已经上传到 myfiles，再将草稿改为发布状态。
`;
}

async function main() {
  const referenceDate = process.env.NEWS_MVP_REFERENCE_DATE
    ? new Date(process.env.NEWS_MVP_REFERENCE_DATE)
    : new Date();
  if (Number.isNaN(referenceDate.getTime())) {
    throw new Error("NEWS_MVP_REFERENCE_DATE must be a valid date string.");
  }

  const week = getPreviousTaipeiWeek(referenceDate);
  const publicBase = process.env.MYFILES_PUBLIC_BASE || "https://files.js.gripe";
  const sourceConfig = await readJson(sourcesPath);
  const assetManifest = await readJson(assetsPath);
  const brief = sourceConfig.weeklyBriefs?.[week.key] ?? fallbackBrief(week, sourceConfig);
  const assets = assetManifest[week.key] ?? {};
  const outputDir = path.join(rootDir, "content/posts", week.slug);
  const outputPath = path.join(outputDir, "index.zh-CN.md");

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    outputPath,
    renderPost({ week, brief, assets, publicBase, sources: sourceConfig.sources }),
    "utf8",
  );

  console.log(`Generated ${path.relative(rootDir, outputPath)} for ${week.key}`);
}

await main();
