#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(rootDir, "myfiles-assets/2026-05-11_2026-05-17");
const framesDir = path.join(outDir, "frames");
const segmentsDir = path.join(outDir, "segments");
const audioDir = path.join(outDir, "audio");
const realDir = path.join(outDir, "real");
const videoDir = path.join(outDir, "video");
const width = 1920;
const height = 1080;
const fontFamily = "Droid Sans Fallback";

const scenes = [
  {
    dur: 12,
    image: "great-hall.jpg",
    video: "hormuz-irgc.webm",
    videoSourceId: "hormuz-irgc",
    sourceId: "great-hall",
    kicker: "Codex 观澜｜台北时间 2026-05-11 至 2026-05-17",
    title: "北京握手，霍尔木兹仍在燃烧",
    body: "稳定谈判撞上战争外溢：中美试图修复贸易，中东与俄乌风险继续扩散。",
    notes: ["北京会晤", "能源通道", "台海压力"],
    voiceover: [
      "上周，按台北时间五月十一日到十七日来看，世界的关键词不是单一冲突，而是两个方向同时发生：一边是大国试图重新谈判秩序，另一边是战争风险继续外溢。",
    ],
  },
  {
    dur: 34,
    image: "great-hall.jpg",
    sourceId: "great-hall",
    kicker: "主线一｜北京会晤",
    title: "贸易修复，但台湾议题升温",
    body: "中美谈农业采购和市场准入；台湾议题同时进入会晤阴影，安全承诺与国际参与被推到前台。",
    notes: ["贸易修复", "市场准入", "台湾议题"],
    voiceover: [
      "开场先看北京。特朗普五月十三日到十五日访华，中美会晤后，双方把重点放在贸易修复、农业采购和市场准入。英文报道显示，中国承诺二零二六到二零二八年每年至少购买一百七十亿美元美国农产品，并推进牛肉、禽类等市场准入安排。",
    ],
  },
  {
    dur: 30,
    image: "taipei-presidential-office.jpg",
    sourceId: "taipei-presidential-office",
    kicker: "主线二｜台湾",
    title: "WHA 受阻，不被交易的回应",
    body: "台湾不是边缘议题，而是中美谈判、国际组织参与与区域安全之间的交叉点。",
    notes: ["WHA", "台北回应", "国际参与"],
    voiceover: [
      "但这不是一个单纯的贸易新闻。因为台湾议题也被带入这场会晤。路透报道，习近平在会晤中警告特朗普，台湾问题若处理不当可能走向危险局面。随后，赖清德在五月十七日回应称，台湾不会被牺牲、交易或被迫接受安排。",
      "同一周，中国也表示不会允许台湾参加世界卫生大会，台湾则准备在正式会议外进行国际会晤。换句话说，台湾不是上周的边缘议题，而是中美谈判、国际组织参与与区域安全之间的交叉点。",
    ],
  },
  {
    dur: 32,
    image: "barakah.jpg",
    video: "hormuz-irgc.webm",
    sourceId: "barakah",
    videoSourceId: "hormuz-irgc",
    kicker: "主线三｜中东能源",
    title: "无人机把风险传导到油价",
    body: "巴拉卡核电站周边事件与沙特拦截无人机，让霍尔木兹、油轮与核设施安全进入同一张风险图。",
    notes: ["Barakah", "无人机", "霍尔木兹"],
    voiceover: [
      "第二条主线在中东。五月十七日，阿联酋巴拉卡核电站周边遭无人机袭击并引发火情，官方称没有人员伤亡，也没有辐射外泄；沙特同日也通报拦截无人机。市场反应很快，油价升至两周高位，因为投资者担心霍尔木兹海峡与海湾能源通道继续受到冲击。",
      "这条新闻的关键，不只是核电站有没有受损，而是无人机、能源通道、核设施周边安全和油价预期被绑在一起。它说明地区战事可以很快传导到全球能源市场，也会让海湾航线、保险和供应链重新定价。",
    ],
  },
  {
    dur: 31,
    image: "ukraine-drone-damage.jpg",
    sourceId: "ukraine-drone-damage",
    kicker: "主线四｜俄乌战场",
    title: "无人机化、远程化、后方化",
    body: "战争不再只发生在前线；后方城市、能源设施和交通节点都在被纳入打击范围。",
    notes: ["远程打击", "城市后方", "防空压力"],
    voiceover: [
      "第三条主线，是战争越来越无人机化。俄乌战场上，俄罗斯称过去一周击落大量乌克兰无人机，莫斯科遭遇一年多来最大规模袭击之一；乌克兰方面也遭到俄罗斯大规模无人机和导弹攻击。",
      "这个趋势说明，战争不再只发生在前线。后方城市、能源设施、交通节点和心理安全，都在被纳入打击范围。无人机降低了远程打击门槛，也让战争在地理上变宽，在时间上变得更日常。",
    ],
  },
  {
    dur: 27,
    image: "semiconductor.jpg",
    sourceId: "semiconductor",
    kicker: "主线五｜AI 供应链",
    title: "三星罢工风险暴露利润分配矛盾",
    body: "AI 热潮不只在模型发布会，也在芯片工厂、工会谈判和供应链利润表里。",
    notes: ["芯片工厂", "劳资谈判", "AI 利润"],
    voiceover: [
      "第四条主线，是 AI 热潮背后的现实成本。三星电子因为奖金、薪资和 AI 芯片繁荣下的利润分配问题，面临大规模罢工风险。韩国政府介入，是因为三星不仅是一家公司，它还是韩国出口和全球芯片供应链的重要节点。",
      "AI 的故事，不只发生在模型和发布会上，也发生在工厂、工会和供应链谈判桌上。当芯片利润上升，工人、公司、政府和客户之间都会重新谈判谁获得收益，谁承担中断风险。",
    ],
  },
  {
    dur: 24,
    image: "ebola-virus.jpg",
    sourceId: "ebola-virus",
    kicker: "主线六｜公共健康",
    title: "埃博拉、汉坦病毒、极端天气",
    body: "全球风险不只来自战争和贸易，也来自疾病、气候和跨境流动。",
    notes: ["公共健康", "跨境流动", "极端天气"],
    voiceover: [
      "最后，公共健康和气候也在提醒世界风险没有暂停。WHO 将刚果和乌干达的埃博拉疫情列为国际关注的突发公共卫生事件；同周，南美邮轮相关的安第斯汉坦病毒感染也受到关注。印度北方邦则遭遇强风暴，造成严重伤亡。",
    ],
  },
  {
    dur: 18,
    image: "hormuz.jpg",
    video: "hormuz-irgc.webm",
    videoSourceId: "hormuz-irgc",
    sourceId: "hormuz",
    kicker: "收束",
    title: "高风险，但仍在谈判的一周",
    body: "北京在谈判，台海在承压，海湾在燃烧，俄乌在无人机化，AI 供应链在重新分配利润。",
    notes: ["谈判", "外溢", "再分配"],
    voiceover: [
      "所以，上周的世界可以这样总结：北京在谈判，台海在承压，海湾在燃烧，俄乌在无人机化，AI 供应链在重新分配利润。表面上是几条新闻，背后其实是同一个问题：全球秩序正在尝试恢复稳定，但风险正在从战场、能源、科技和公共卫生同时扩散。这里是 Codex 观澜，我们下周继续交叉阅读世界。",
    ],
  },
];

const attributions = {
  "great-hall": {
    file: "Great Hall of the People in Beijing, 18 April 2011.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Great_Hall_of_the_People_in_Beijing,_18_April_2011.jpg",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based background, cropped/color graded with notebook overlays.",
  },
  "taipei-presidential-office": {
    file: "Taipei Taiwan Presidential-Office-Building-01.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Taipei_Taiwan_Presidential-Office-Building-01.jpg",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based background, cropped/color graded with notebook overlays.",
  },
  barakah: {
    file: "Barakah nuclear power plant.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Barakah_nuclear_power_plant.jpg",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based background, cropped/color graded with notebook overlays.",
  },
  "hormuz-irgc": {
    file: '"Unsafe and Unprofessional Interaction with IRGCN FIAC in Strait of Hormuz" May 10 2021.webm',
    source: "https://commons.wikimedia.org/wiki/File:%22Unsafe_and_Unprofessional_Interaction_with_IRGCN_FIAC_in_Strait_of_Hormuz%22_May_10_2021.webm",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based video background, clipped/cropped/color graded with notebook overlays.",
  },
  "ukraine-drone-damage": {
    file: "Kyiv after Russian drone attack, 2023-08-02 (01).jpg",
    source: "https://commons.wikimedia.org/wiki/File:Kyiv_after_Russian_drone_attack,_2023-08-02_(01).jpg",
    license: "CC BY 4.0; State Emergency Service of Ukraine via Wikimedia Commons",
    use: "Reality-based background, cropped/color graded with notebook overlays.",
  },
  semiconductor: {
    file: "Cleanroom - photolithography lab (9148324481).jpg",
    source: "https://commons.wikimedia.org/wiki/File:Cleanroom_-_photolithography_lab_(9148324481).jpg",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based background, cropped/color graded with notebook overlays.",
  },
  "ebola-virus": {
    file: "Ebola virus.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Ebola_virus.jpg",
    license: "Public domain; CDC/Cynthia Goldsmith via Wikimedia Commons",
    use: "Reality-based microscopy image, cropped/color graded with notebook overlays.",
  },
  hormuz: {
    file: "Strait of Hormuz.jpg",
    source: "https://commons.wikimedia.org/wiki/File:Strait_of_Hormuz.jpg",
    license: "Wikimedia Commons license terms on file page",
    use: "Reality-based map/satellite image, cropped/color graded with notebook overlays.",
  },
};

function voiceoverText() {
  return scenes.flatMap((scene) => scene.voiceover).join("\n\n");
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function wrapText(text, maxChars) {
  const lines = [];
  let line = "";
  for (const char of text) {
    line += char;
    if ((line.length >= maxChars && /[，。；：、\s]/.test(char)) || line.length >= maxChars + 4) {
      lines.push(line.trim());
      line = "";
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function overlaySvg(scene, index) {
  const titleLines = wrapText(scene.title, 15);
  const bodyLines = wrapText(scene.body, 19);
  const notes = scene.notes.map((note, noteIndex) => {
    const x = 1280 + (noteIndex % 2) * 210;
    const y = 190 + noteIndex * 118;
    const rotation = [-3, 2, -1][noteIndex] ?? 0;
    return `
      <g transform="rotate(${rotation} ${x + 94} ${y + 34})">
        <rect x="${x}" y="${y}" width="210" height="68" rx="6" fill="#fff2bc" opacity="0.94" stroke="#252525" stroke-width="3"/>
        <text x="${x + 22}" y="${y + 44}" font-family="${fontFamily}" font-size="27" fill="#171717">${esc(note)}</text>
      </g>`;
  }).join("");
  const title = titleLines.map((line, lineIndex) =>
    `<text x="126" y="${268 + lineIndex * 82}" font-family="${fontFamily}" font-size="70" font-weight="700" fill="#fbfbf5">${esc(line)}</text>`
  ).join("");
  const body = bodyLines.map((line, lineIndex) =>
    `<text x="132" y="${520 + lineIndex * 48}" font-family="${fontFamily}" font-size="30" fill="#171717">${esc(line)}</text>`
  ).join("");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="1920" height="1080" fill="#050505" opacity="0.20"/>
    <rect x="0" y="0" width="1920" height="1080" fill="url(#v)"/>
    <defs>
      <linearGradient id="v" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.68"/>
        <stop offset="0.52" stop-color="#000" stop-opacity="0.25"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.50"/>
      </linearGradient>
    </defs>
    <path d="M98 112 L760 96 L780 154 L120 166 Z" fill="#f8df7e" opacity="0.96"/>
    <text x="130" y="143" font-family="${fontFamily}" font-size="24" fill="#151515">${esc(scene.kicker)}</text>
    ${title}
    <g transform="rotate(-1 430 608)">
      <rect x="106" y="458" width="840" height="250" rx="8" fill="#f8f1df" opacity="0.93" stroke="#222" stroke-width="3"/>
      <path d="M130 506 H900 M130 556 H900 M130 606 H900 M130 656 H900" stroke="#a9a092" stroke-width="2" opacity="0.55"/>
      ${body}
    </g>
    <path d="M1240 148 C1320 110 1430 112 1516 150" fill="none" stroke="#fff2bc" stroke-width="6" stroke-linecap="round" opacity="0.9"/>
    <path d="M1516 150 l-42 -6 l28 31" fill="none" stroke="#fff2bc" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    ${notes}
    <g transform="rotate(1 244 940)">
      <rect x="112" y="912" width="430" height="54" rx="5" fill="#101820" opacity="0.86"/>
      <text x="134" y="948" font-family="${fontFamily}" font-size="25" fill="#f8f1df">Codex 观澜 · Weekly News</text>
    </g>
    <text x="1620" y="974" font-family="${fontFamily}" font-size="28" fill="#f8f1df">${index + 1}/${scenes.length}</text>
  </svg>`;
}

function ts(seconds) {
  const ms = Math.round((seconds % 1) * 1000);
  const total = Math.floor(seconds);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function splitSubtitleText(text, maxChars = 18) {
  const sentences = text
    .replaceAll("\n", "")
    .split(/(?<=[。；？！])/)
    .map((item) => item.trim())
    .filter(Boolean);
  const items = [];
  for (const sentence of sentences) {
    let current = "";
    for (const char of sentence) {
      current += char;
      if ((current.length >= 10 && /[，。；：、]/.test(char)) || current.length >= maxChars) {
        items.push(current.trim());
        current = "";
      }
    }
    if (current.trim()) items.push(current.trim());
  }
  return items;
}

function captionEntries() {
  const entries = [];
  let cursor = 0;
  for (const scene of scenes) {
    const subtitles = splitSubtitleText(scene.voiceover.join(""));
    const weights = subtitles.map((item) => Math.max(8, item.length));
    const totalWeight = weights.reduce((sum, item) => sum + item, 0) || 1;
    let localCursor = cursor;
    subtitles.forEach((text, index) => {
      const dur = index === subtitles.length - 1
        ? cursor + scene.dur - localCursor
        : scene.dur * (weights[index] / totalWeight);
      const start = localCursor;
      const end = Math.min(cursor + scene.dur, localCursor + Math.max(1.8, dur));
      entries.push([entries.length + 1, start, end, text]);
      localCursor = end;
    });
    cursor += scene.dur;
  }
  return entries;
}

function srt() {
  return captionEntries()
    .map(([idx, start, end, text]) => `${idx}\n${ts(start)} --> ${ts(end)}\n${text}\n`)
    .join("\n");
}

async function mediaDuration(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=nk=1:nw=1",
    filePath,
  ]);
  return Number(stdout.trim());
}

function fitSceneDurations(targetDuration) {
  const totalChars = scenes.reduce((sum, scene) => sum + scene.voiceover.join("").length, 0);
  const total = Math.max(90, targetDuration);
  for (const scene of scenes) {
    const ratio = scene.voiceover.join("").length / totalChars;
    scene.dur = Math.max(8, Math.round(total * ratio * 10) / 10);
  }
  const diff = total - scenes.reduce((sum, scene) => sum + scene.dur, 0);
  scenes[scenes.length - 1].dur = Math.max(8, Math.round((scenes[scenes.length - 1].dur + diff) * 10) / 10);
}

function concatList() {
  let text = "";
  for (let i = 0; i < scenes.length; i++) {
    text += `file 'segments/scene-${String(i + 1).padStart(2, "0")}.mp4'\n`;
  }
  return text;
}

async function makeFrame(scene, index) {
  const basePath = path.join(realDir, scene.image);
  const overlay = await sharp(Buffer.from(overlaySvg(scene, index))).png().toBuffer();
  return sharp(basePath)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .modulate({ brightness: 0.86, saturation: 0.86 })
    .blur(0.3)
    .composite([{ input: overlay, blend: "over" }])
    .webp({ quality: 91 })
    .toBuffer();
}

async function makeOverlay(scene, index) {
  return sharp(Buffer.from(overlaySvg(scene, index))).png().toBuffer();
}

async function renderSegment(scene, index) {
  const number = String(index + 1).padStart(2, "0");
  const segmentPath = path.join(segmentsDir, `scene-${number}.mp4`);
  const visualPath = path.join(segmentsDir, `scene-${number}.visual.mp4`);
  const fadeOutStart = Math.max(0, scene.dur - 0.35).toFixed(2);
  if (scene.video) {
    const overlayPath = path.join(framesDir, `overlay-${number}.png`);
    await fs.writeFile(overlayPath, await makeOverlay(scene, index));
    await execFileAsync("ffmpeg", [
      "-y",
      "-v", "error",
      "-stream_loop", "-1",
      "-ss", "4",
      "-t", String(scene.dur),
      "-i", path.join(videoDir, scene.video),
      "-i", overlayPath,
      "-filter_complex",
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},eq=brightness=-0.08:saturation=0.82,format=rgba[bg];[bg][1:v]overlay=0:0,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.35,format=yuv420p[v]`,
      "-map", "[v]",
      "-an",
      "-r", "24",
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-tune", "zerolatency",
      "-pix_fmt", "yuv420p",
      visualPath,
    ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });
    return muxSegmentAudio({ visualPath, audioPath: scene.audioPath, outputPath: segmentPath });
  }

  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-loop", "1",
    "-t", String(scene.dur),
    "-i", path.join(framesDir, `scene-${number}.webp`),
    "-vf", `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.35,fps=24,format=yuv420p`,
    "-an",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "stillimage",
    "-pix_fmt", "yuv420p",
    visualPath,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });
  return muxSegmentAudio({ visualPath, audioPath: scene.audioPath, outputPath: segmentPath });
}

async function muxSegmentAudio({ visualPath, audioPath, outputPath }) {
  if (!audioPath) {
    await fs.copyFile(visualPath, outputPath);
    return outputPath;
  }
  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-i", visualPath,
    "-i", audioPath,
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "48000",
    "-af", "loudnorm=I=-18:LRA=11:TP=-2.0,volume=-1dB,apad",
    "-shortest",
    outputPath,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });
  return outputPath;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function prepareSceneAudio(scene, index) {
  const number = String(index + 1).padStart(2, "0");
  const textPath = path.join(audioDir, `scene-${number}.txt`);
  const localPath = path.join(audioDir, `scene-${number}.wav`);
  const text = scene.voiceover.join("\n\n");
  await fs.writeFile(textPath, text, "utf8");

  const edgeEndpoint = process.env.NEWS_TTS_ENDPOINT || process.env.EDGE_WORKER_TTS_ENDPOINT || "";
  if (edgeEndpoint) {
    const edgePath = path.join(audioDir, `scene-${number}.edge.mp3`);
    if (await exists(edgePath)) {
      try {
        await auditAudio(edgePath, textPath, number);
        scene.audioPath = edgePath;
        scene.dur = Math.max(8, Math.round((await mediaDuration(edgePath) + 0.6) * 10) / 10);
        return;
      } catch (error) {
        console.warn(`Existing Edge Worker TTS failed audit for scene ${number}: ${error.message}`);
      }
    }
    try {
      await execFileAsync("node", [
        path.join(rootDir, "scripts/news-mvp/edge-worker-tts.mjs"),
        `--input=${textPath}`,
        `--output=${edgePath}`,
      ], { cwd: rootDir, maxBuffer: 1024 * 1024 * 4 });
      await auditAudio(edgePath, textPath, number);
      scene.audioPath = edgePath;
      scene.dur = Math.max(8, Math.round((await mediaDuration(edgePath) + 0.6) * 10) / 10);
      return;
    } catch (error) {
      console.warn(`Edge Worker TTS failed audit for scene ${number}: ${error.message}`);
    }
  }

  await execFileAsync("espeak-ng", [
    "-v", "zh",
    "-s", "155",
    "-p", "35",
    "-w", localPath,
    "-f", textPath,
  ], { maxBuffer: 1024 * 1024 * 2 });
  await auditAudio(localPath, textPath, number);
  scene.audioPath = localPath;
  scene.dur = Math.max(8, Math.round((await mediaDuration(localPath) + 0.6) * 10) / 10);
}

async function auditAudio(audioPath, textPath, number) {
  await execFileAsync("node", [
    path.join(rootDir, "scripts/news-mvp/audit-audio-transcript.mjs"),
    `--audio=${audioPath}`,
    `--text=${textPath}`,
    `--transcript=${path.join(audioDir, `scene-${number}.transcript.txt`)}`,
  ], { cwd: rootDir, maxBuffer: 1024 * 1024 * 4 });
}

async function main() {
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(segmentsDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.rm(path.join(outDir, "generated-cover.png"), { force: true });
  const final = path.join(outDir, "weekly-world-news.mp4");
  const voiceover = voiceoverText();
  await fs.writeFile(path.join(outDir, "voiceover_zh.md"), voiceover, "utf8");
  await fs.writeFile(path.join(outDir, "voiceover_zh.txt"), voiceover, "utf8");
  for (let i = 0; i < scenes.length; i++) {
    await prepareSceneAudio(scenes[i], i);
  }

  for (let i = 0; i < scenes.length; i++) {
    const image = await makeFrame(scenes[i], i);
    await fs.writeFile(path.join(framesDir, `scene-${String(i + 1).padStart(2, "0")}.webp`), image);
  }
  for (let i = 0; i < scenes.length; i++) {
    await renderSegment(scenes[i], i);
  }
  await fs.copyFile(path.join(framesDir, "scene-01.webp"), path.join(outDir, "cover.webp"));
  await fs.writeFile(path.join(outDir, "captions.srt"), srt(), "utf8");
  await fs.writeFile(path.join(outDir, "ATTRIBUTION.json"), JSON.stringify(attributions, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "shotlist.csv"), [
    "timecode_start,timecode_end,segment,visual_keywords,caption_zh,source_type,license_note",
    ...scenes.map((scene, i) => {
      const start = scenes.slice(0, i).reduce((sum, item) => sum + item.dur, 0);
      const end = start + scene.dur;
      const attr = attributions[scene.sourceId];
      const videoAttr = scene.videoSourceId ? attributions[scene.videoSourceId] : null;
      const sourceType = videoAttr ? "reality_based_video" : "reality_based_image";
      const licenseNote = videoAttr
        ? `${attr.file}; ${attr.license}; ${attr.source} | ${videoAttr.file}; ${videoAttr.license}; ${videoAttr.source}`
        : `${attr.file}; ${attr.license}; ${attr.source}`;
      return `${ts(start).replace(",", ".")},${ts(end).replace(",", ".")},"${scene.title}","${scene.notes.join("; ")}","${scene.body}","${sourceType}","${licenseNote}"`;
    }),
  ].join("\n"), "utf8");
  await fs.writeFile(path.join(outDir, "frames.txt"), concatList(), "utf8");

  const silent = path.join(outDir, "silent.mp4");
  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-f", "concat",
    "-safe", "0",
    "-i", path.join(outDir, "frames.txt"),
    "-c:v", "copy",
    "-pix_fmt", "yuv420p",
    silent,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });

  await execFileAsync("ffmpeg", [
    "-y",
    "-v", "error",
    "-i", silent,
    "-c", "copy",
    final,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });

  console.log(`Rendered ${path.relative(rootDir, final)}`);
}

await main();
