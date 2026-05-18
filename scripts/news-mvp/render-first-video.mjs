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
const realDir = path.join(outDir, "real");
const videoDir = path.join(outDir, "video");
const width = 1920;
const height = 1080;
const fontFamily = "Droid Sans Fallback";

const scenes = [
  {
    dur: 12,
    image: "great-hall.jpg",
    sourceId: "great-hall",
    kicker: "Codex 观澜｜台北时间 2026-05-11 至 2026-05-17",
    title: "北京握手，霍尔木兹仍在燃烧",
    body: "稳定谈判撞上战争外溢：中美试图修复贸易，中东与俄乌风险继续扩散。",
    notes: ["北京会晤", "能源通道", "台海压力"],
  },
  {
    dur: 34,
    image: "great-hall.jpg",
    sourceId: "great-hall",
    kicker: "主线一｜北京会晤",
    title: "贸易修复，但台湾议题升温",
    body: "中美谈农业采购和市场准入；台湾议题同时进入会晤阴影，安全承诺与国际参与被推到前台。",
    notes: ["贸易修复", "市场准入", "台湾议题"],
  },
  {
    dur: 30,
    image: "taipei-presidential-office.jpg",
    sourceId: "taipei-presidential-office",
    kicker: "主线二｜台湾",
    title: "WHA 受阻，不被交易的回应",
    body: "台湾不是边缘议题，而是中美谈判、国际组织参与与区域安全之间的交叉点。",
    notes: ["WHA", "台北回应", "国际参与"],
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
  },
  {
    dur: 31,
    image: "ukraine-drone-damage.jpg",
    sourceId: "ukraine-drone-damage",
    kicker: "主线四｜俄乌战场",
    title: "无人机化、远程化、后方化",
    body: "战争不再只发生在前线；后方城市、能源设施和交通节点都在被纳入打击范围。",
    notes: ["远程打击", "城市后方", "防空压力"],
  },
  {
    dur: 27,
    image: "semiconductor.jpg",
    sourceId: "semiconductor",
    kicker: "主线五｜AI 供应链",
    title: "三星罢工风险暴露利润分配矛盾",
    body: "AI 热潮不只在模型发布会，也在芯片工厂、工会谈判和供应链利润表里。",
    notes: ["芯片工厂", "劳资谈判", "AI 利润"],
  },
  {
    dur: 24,
    image: "ebola-virus.jpg",
    sourceId: "ebola-virus",
    kicker: "主线六｜公共健康",
    title: "埃博拉、汉坦病毒、极端天气",
    body: "全球风险不只来自战争和贸易，也来自疾病、气候和跨境流动。",
    notes: ["公共健康", "跨境流动", "极端天气"],
  },
  {
    dur: 18,
    image: "hormuz.jpg",
    sourceId: "hormuz",
    kicker: "收束",
    title: "高风险，但仍在谈判的一周",
    body: "北京在谈判，台海在承压，海湾在燃烧，俄乌在无人机化，AI 供应链在重新分配利润。",
    notes: ["谈判", "外溢", "再分配"],
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

const captions = [
  [1, 0, 7, "上周最重要的画面，是北京的握手。"],
  [2, 7, 13, "最危险的声音，是海湾上空的无人机。"],
  [3, 13, 20, "中美试图重启贸易秩序，战争风险继续外溢。"],
  [4, 20, 28, "第一条主线在北京：贸易修复，但台湾议题升温。"],
  [5, 28, 36, "英文报道显示，农业采购和市场准入成为会晤重点。"],
  [6, 36, 45, "但这不是单纯的农产品新闻，台湾也在同一张谈判桌旁边。"],
  [7, 45, 54, "台湾不是边缘议题，而是国际参与、安全承诺与大国谈判的交叉点。"],
  [8, 54, 64, "WHA 受阻、台北回应与会外外交，让这条线更贴近台湾读者。"],
  [9, 64, 74, "第二条主线在中东：无人机事件把战争风险传导到油价。"],
  [10, 74, 84, "巴拉卡核电站周边、霍尔木兹海峡和油轮航线，被放进同一张风险图。"],
  [11, 84, 94, "第三条主线，是俄乌战争继续无人机化。"],
  [12, 94, 105, "战争不再只发生在前线，后方城市、能源设施和交通节点都被纳入打击范围。"],
  [13, 105, 116, "第四条主线，是 AI 热潮背后的现实成本。"],
  [14, 116, 128, "三星罢工风险提醒我们，AI 不只在模型发布会，也在工厂和工会谈判桌上。"],
  [15, 128, 140, "最后，公共健康和气候也在提醒世界：风险没有暂停。"],
  [16, 140, 153, "埃博拉、汉坦病毒和极端天气，构成主线之外的快讯层。"],
  [17, 153, 166, "所以，上周的世界是：北京在谈判，台海在承压，海湾在燃烧。"],
  [18, 166, 180, "俄乌在无人机化，AI 供应链在重新分配利润。"],
  [19, 180, 198, "这里是 Codex 观澜。我们下周继续交叉阅读世界。"],
];

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

function srt() {
  return captions
    .map(([idx, start, end, text]) => `${idx}\n${ts(start)} --> ${ts(end)}\n${text}\n`)
    .join("\n");
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
  const fadeOutStart = Math.max(0, scene.dur - 0.35).toFixed(2);
  if (scene.video) {
    const overlayPath = path.join(framesDir, `overlay-${number}.png`);
    await fs.writeFile(overlayPath, await makeOverlay(scene, index));
    await execFileAsync("ffmpeg", [
      "-y",
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
      segmentPath,
    ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });
    return segmentPath;
  }

  await execFileAsync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-t", String(scene.dur),
    "-i", path.join(framesDir, `scene-${number}.webp`),
    "-vf", `fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.35,fps=24,format=yuv420p`,
    "-an",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "stillimage",
    "-pix_fmt", "yuv420p",
    segmentPath,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });
  return segmentPath;
}

async function main() {
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(segmentsDir, { recursive: true });
  await fs.rm(path.join(outDir, "generated-cover.png"), { force: true });
  for (let i = 0; i < scenes.length; i++) {
    const image = await makeFrame(scenes[i], i);
    await fs.writeFile(path.join(framesDir, `scene-${String(i + 1).padStart(2, "0")}.webp`), image);
  }
  for (let i = 0; i < scenes.length; i++) {
    await renderSegment(scenes[i], i);
  }
  await fs.copyFile(path.join(framesDir, "scene-01.webp"), path.join(outDir, "cover.webp"));
  await fs.writeFile(path.join(outDir, "captions.srt"), srt(), "utf8");
  const voiceoverText = captions.map(([, , , text]) => text).join("\n\n");
  await fs.writeFile(path.join(outDir, "voiceover_zh.md"), voiceoverText, "utf8");
  await fs.writeFile(path.join(outDir, "voiceover_zh.txt"), voiceoverText, "utf8");
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
    "-f", "concat",
    "-safe", "0",
    "-i", path.join(outDir, "frames.txt"),
    "-c:v", "copy",
    "-pix_fmt", "yuv420p",
    silent,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });

  const final = path.join(outDir, "weekly-world-news.mp4");
  const narration = path.join(outDir, "narration.wav");
  let audioInput = "anullsrc=channel_layout=stereo:sample_rate=48000";
  let useLavfiAudio = true;
  try {
    await execFileAsync("espeak-ng", [
      "-v", "zh",
      "-s", "155",
      "-p", "35",
      "-w", narration,
      "-f", path.join(outDir, "voiceover_zh.txt"),
    ], { maxBuffer: 1024 * 1024 * 2 });
    audioInput = narration;
    useLavfiAudio = false;
  } catch {
    // Leave a silent audio bed if local TTS is unavailable.
  }

  await execFileAsync("ffmpeg", [
    "-y",
    "-i", silent,
    ...(useLavfiAudio ? ["-f", "lavfi"] : []),
    "-i", audioInput,
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "128k",
    "-af", useLavfiAudio ? "apad" : "loudnorm=I=-16:LRA=11:TP=-1.5,apad",
    "-shortest",
    final,
  ], { cwd: outDir, maxBuffer: 1024 * 1024 * 8 });

  console.log(`Rendered ${path.relative(rootDir, final)}`);
}

await main();
