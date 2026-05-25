#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
function initialArgValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

const weekKey = initialArgValue("week") || process.env.NEWS_MVP_ASSET_WEEK || "2026-05-11_2026-05-17";
const [weekStart, weekEnd] = weekKey.split("_");
const videoSlug = `weekly-world-news-${weekStart}`;
const videoWorkspaceRoot = process.env.NEWS_MVP_VIDEO_WORKSPACE_ROOT || "/opt/codex_mark_vedio";
const baseOutDir = path.resolve(process.env.NEWS_MVP_VIDEO_WORKSPACE || path.join(videoWorkspaceRoot, weekKey));
let outDir = baseOutDir;
let framesDir = path.join(outDir, "frames");
let segmentsDir = path.join(outDir, "segments");
let audioDir = path.join(outDir, "audio");
const realDir = path.join(baseOutDir, "real");
const videoDir = path.join(baseOutDir, "video");
const width = 1920;
const height = 1080;
const fontFamily = "Droid Sans Fallback";
const defaultTtsEndpoint = "https://tts.wangwangit.com";

async function loadLocalEnv() {
  const envPath = path.join(rootDir, ".env.local");
  try {
    const text = await fs.readFile(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index);
      const value = trimmed.slice(index + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local env is optional.
  }
}

function argValue(name) {
  const prefix = `--${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : "";
}

function argFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

async function loadSceneProfile(locale) {
  const profilePath = argValue("scene-profile") || process.env.NEWS_MVP_SCENE_PROFILE || "";
  if (!profilePath) return null;
  const profileJson = JSON.parse(await fs.readFile(path.resolve(profilePath), "utf8"));
  const override = profileJson.locales?.[locale] ?? profileJson[locale] ?? null;
  if (!override) throw new Error(`Scene profile ${profilePath} does not include locale: ${locale}`);
  if (!Array.isArray(override.scenes) || override.scenes.length === 0) {
    throw new Error(`Scene profile ${profilePath} locale ${locale} has no scenes.`);
  }
  return {
    suffix: override.suffix ?? locale,
    voice: override.voice ?? localeProfiles[locale]?.voice,
    espeak: override.espeak ?? localeProfiles[locale]?.espeak,
    footer: override.footer ?? localeProfiles[locale]?.footer,
    articleTitle: override.articleTitle,
    coverKicker: override.coverKicker ?? localeProfiles[locale]?.coverKicker,
    voiceoverFile: override.voiceoverFile ?? `voiceover_${locale}.md`,
    srtFile: override.srtFile ?? `captions.${locale}.srt`,
    vttFile: override.vttFile ?? `${videoSlug}.${locale}.vtt`,
    videoFile: override.videoFile ?? `weekly-world-news.${locale}.mp4`,
    scenes: override.scenes,
  };
}

const baseScenes = [
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

const localeProfiles = {
  "zh-CN": {
    suffix: "zh-CN",
    voice: "zh-CN-YunyangNeural",
    espeak: "zh",
    footer: "Codex 观澜 · Weekly News",
    articleTitle: "北京握手，霍尔木兹仍在燃烧：上周世界发生了什么",
    coverKicker: "简体中文语音版",
    voiceoverFile: "voiceover_zh-CN.md",
    srtFile: "captions.zh-CN.srt",
    vttFile: `${videoSlug}.zh-CN.vtt`,
    videoFile: "weekly-world-news.zh-CN.mp4",
    scenes: baseScenes.map((scene) => ({ ...scene, voiceover: [...scene.voiceover], notes: [...scene.notes] })),
  },
  "zh-TW": {
    suffix: "zh-TW",
    voice: "zh-TW-YunJheNeural",
    espeak: "zh",
    footer: "Codex 觀瀾 · Weekly News",
    articleTitle: "北京握手，荷莫茲仍在燃燒：上週世界發生了什麼",
    coverKicker: "繁體中文語音版",
    voiceoverFile: "voiceover_zh-TW.md",
    srtFile: "captions.zh-TW.srt",
    vttFile: `${videoSlug}.zh-TW.vtt`,
    videoFile: "weekly-world-news.zh-TW.mp4",
    scenes: [
      {
        ...baseScenes[0],
        kicker: "Codex 觀瀾｜台北時間 2026-05-11 至 2026-05-17",
        title: "北京握手，荷莫茲仍在燃燒",
        body: "穩定談判撞上戰爭外溢：中美試圖修補貿易，中東與俄烏風險持續擴散。",
        notes: ["北京會晤", "能源通道", "台海壓力"],
        voiceover: ["上週，按台北時間五月十一日到十七日來看，世界的關鍵字不是單一衝突，而是兩個方向同時發生：一邊是大國試圖重新談判秩序，另一邊是戰爭風險持續外溢。"],
      },
      {
        ...baseScenes[1],
        kicker: "主線一｜北京會晤",
        title: "貿易修補，但台灣議題升溫",
        body: "中美談農業採購和市場准入；台灣議題同時進入會晤陰影，安全承諾與國際參與被推到前台。",
        notes: ["貿易修補", "市場准入", "台灣議題"],
        voiceover: ["開場先看北京。特朗普五月十三日到十五日訪華，中美會晤後，雙方把重點放在貿易修補、農業採購和市場准入。英文報導顯示，中國承諾二零二六到二零二八年每年至少購買一百七十億美元美國農產品，並推進牛肉、禽類等市場准入安排。"],
      },
      {
        ...baseScenes[2],
        kicker: "主線二｜台灣",
        title: "WHA 受阻，不被交易的回應",
        body: "台灣不是邊緣議題，而是中美談判、國際組織參與與區域安全之間的交會點。",
        notes: ["WHA", "台北回應", "國際參與"],
        voiceover: ["但這不是一則單純的貿易新聞。因為台灣議題也被帶進這場會晤。路透報導，習近平在會晤中警告特朗普，台灣問題若處理不當可能走向危險局面。隨後，賴清德在五月十七日回應稱，台灣不會被犧牲、交易或被迫接受安排。", "同一週，中國也表示不會允許台灣參加世界衛生大會，台灣則準備在正式會議外進行國際會晤。換句話說，台灣不是上週的邊緣議題，而是中美談判、國際組織參與與區域安全之間的交會點。"],
      },
      {
        ...baseScenes[3],
        kicker: "主線三｜中東能源",
        title: "無人機把風險傳導到油價",
        body: "巴拉卡核電廠周邊事件與沙烏地攔截無人機，讓荷莫茲、油輪與核設施安全進入同一張風險圖。",
        notes: ["Barakah", "無人機", "荷莫茲"],
        voiceover: ["第二條主線在中東。五月十七日，阿聯巴拉卡核電廠周邊遭無人機襲擊並引發火勢，官方稱沒有傷亡，也沒有輻射外洩；沙烏地同日也通報攔截無人機。市場反應很快，油價升至兩週高位，因為投資者擔心荷莫茲海峽與海灣能源通道繼續受到衝擊。", "這條新聞的關鍵，不只是核電廠有沒有受損，而是無人機、能源通道、核設施周邊安全和油價預期被綁在一起。它說明地區戰事可以很快傳導到全球能源市場，也會讓海灣航線、保險和供應鏈重新定價。"],
      },
      {
        ...baseScenes[4],
        kicker: "主線四｜俄烏戰場",
        title: "無人機化、遠程化、後方化",
        body: "戰爭不再只發生在前線；後方城市、能源設施和交通節點都被納入打擊範圍。",
        notes: ["遠程打擊", "城市後方", "防空壓力"],
        voiceover: ["第三條主線，是戰爭越來越無人機化。俄烏戰場上，俄羅斯稱過去一週擊落大量烏克蘭無人機，莫斯科遭遇一年多來最大規模襲擊之一；烏克蘭方面也遭到俄羅斯大規模無人機和飛彈攻擊。", "這個趨勢說明，戰爭不再只發生在前線。後方城市、能源設施、交通節點和心理安全，都被納入打擊範圍。無人機降低了遠程打擊門檻，也讓戰爭在地理上變寬，在時間上變得更日常。"],
      },
      {
        ...baseScenes[5],
        kicker: "主線五｜AI 供應鏈",
        title: "三星罷工風險暴露利潤分配矛盾",
        body: "AI 熱潮不只在模型發表會，也在晶片工廠、工會談判和供應鏈利潤表裡。",
        notes: ["晶片工廠", "勞資談判", "AI 利潤"],
        voiceover: ["第四條主線，是 AI 熱潮背後的現實成本。三星電子因為獎金、薪資和 AI 晶片繁榮下的利潤分配問題，面臨大規模罷工風險。韓國政府介入，是因為三星不僅是一家公司，它還是韓國出口和全球晶片供應鏈的重要節點。", "AI 的故事，不只發生在模型和發表會上，也發生在工廠、工會和供應鏈談判桌上。當晶片利潤上升，工人、公司、政府和客戶之間都會重新談判誰獲得收益，誰承擔中斷風險。"],
      },
      {
        ...baseScenes[6],
        kicker: "主線六｜公共健康",
        title: "伊波拉、漢他病毒、極端天氣",
        body: "全球風險不只來自戰爭和貿易，也來自疾病、氣候和跨境流動。",
        notes: ["公共健康", "跨境流動", "極端天氣"],
        voiceover: ["最後，公共健康和氣候也在提醒世界風險沒有暫停。WHO 將剛果和烏干達的伊波拉疫情列為國際關注的突發公共衛生事件；同週，南美郵輪相關的安地斯漢他病毒感染也受到關注。印度北方邦則遭遇強風暴，造成嚴重傷亡。"],
      },
      {
        ...baseScenes[7],
        kicker: "收束",
        title: "高風險，但仍在談判的一週",
        body: "北京在談判，台海在承壓，海灣在燃燒，俄烏在無人機化，AI 供應鏈在重新分配利潤。",
        notes: ["談判", "外溢", "再分配"],
        voiceover: ["所以，上週的世界可以這樣總結：北京在談判，台海在承壓，海灣在燃燒，俄烏在無人機化，AI 供應鏈在重新分配利潤。表面上是幾條新聞，背後其實是同一個問題：全球秩序正在嘗試恢復穩定，但風險正在從戰場、能源、科技和公共衛生同時擴散。這裡是 Codex 觀瀾，我們下週繼續交叉閱讀世界。"],
      },
    ],
  },
  en: {
    suffix: "en",
    voice: "en-US-GuyNeural",
    espeak: "en-us",
    footer: "Codex Guanlan · Weekly News",
    articleTitle: "The Beijing Handshake, the Gulf Still Burning: What Happened Last Week",
    coverKicker: "English voice edition",
    voiceoverFile: "voiceover_en.md",
    srtFile: "captions.en.srt",
    vttFile: `${videoSlug}.en.vtt`,
    videoFile: "weekly-world-news.en.mp4",
    scenes: [
      {
        ...baseScenes[0],
        kicker: "Codex Guanlan | May 11-17, 2026, Taipei time",
        title: "The Beijing Handshake, the Gulf Still Burning",
        body: "Stabilization talks collided with war spillover: US-China trade repair, Gulf risk, and Ukraine's drone war.",
        notes: ["Beijing talks", "Energy routes", "Taiwan pressure"],
        voiceover: ["Last week, measured from May eleventh to seventeenth in Taipei time, the world was not defined by one event. Two forces moved at once: major powers tried to renegotiate order, while war risk kept spilling outward."],
      },
      {
        ...baseScenes[1],
        kicker: "Line one | Beijing talks",
        title: "Trade repair, but Taiwan heats up",
        body: "Washington and Beijing discussed farm purchases and market access, while Taiwan stayed inside the strategic shadow of the meeting.",
        notes: ["Trade repair", "Market access", "Taiwan"],
        voiceover: ["Start in Beijing. Donald Trump visited China from May thirteenth to fifteenth. After the talks, both sides emphasized trade repair, agricultural purchases, and market access. English-language reports said China committed to buying at least seventeen billion dollars in US farm products annually from twenty twenty-six to twenty twenty-eight, while moving on access for beef and poultry."],
      },
      {
        ...baseScenes[2],
        kicker: "Line two | Taiwan",
        title: "WHA blocked, no bargain over Taiwan",
        body: "Taiwan sat at the intersection of US-China talks, international participation, and regional security commitments.",
        notes: ["WHA", "Taipei response", "International access"],
        voiceover: ["But this was not just a trade story. Taiwan was pulled into the same diplomatic frame. Reuters reported that Xi Jinping warned Trump that mishandling Taiwan could lead to a dangerous place. On May seventeenth, Lai Ching-te answered that Taiwan would not be sacrificed, traded away, or forced to accept an arrangement.", "In the same week, China said it would not allow Taiwan to attend the World Health Assembly, while Taiwan prepared meetings outside the formal session. In other words, Taiwan was not a side issue. It was where great-power bargaining, international organizations, and regional security overlapped."],
      },
      {
        ...baseScenes[3],
        kicker: "Line three | Gulf energy",
        title: "Drones transmit risk into oil",
        body: "The Barakah incident and Saudi drone interceptions tied Hormuz, tankers, and nuclear-site security into one risk map.",
        notes: ["Barakah", "Drones", "Hormuz"],
        voiceover: ["The second major line was the Middle East. On May seventeenth, a drone incident near the Barakah nuclear power plant in the United Arab Emirates caused a fire, while officials said there were no casualties and no radiation leak. Saudi Arabia also reported drone interceptions the same day. Markets reacted quickly, with oil rising to a two-week high as traders worried about the Strait of Hormuz and Gulf energy routes.", "The key point was not only whether the plant was damaged. It was that drones, energy corridors, nuclear-site security, and oil-price expectations were now tied together. A regional war can move fast into global energy markets, shipping insurance, and supply-chain pricing."],
      },
      {
        ...baseScenes[4],
        kicker: "Line four | Ukraine war",
        title: "Drone war moves deeper into the rear",
        body: "The battlefield is widening from front lines to cities, energy sites, transport nodes, and psychological security.",
        notes: ["Long-range strikes", "Rear cities", "Air defense"],
        voiceover: ["The third line was the continuing drone-ization of war. Russia said it had destroyed large numbers of Ukrainian drones over the week, while Moscow faced one of its largest attacks in more than a year. Ukraine, meanwhile, was hit by large-scale Russian drone and missile attacks.", "The trend is clear: war no longer stays at the front. Rear cities, energy infrastructure, transport nodes, and psychological security are all becoming targets. Drones lower the threshold for long-range strikes and make the battlefield wider, more routine, and harder to contain."],
      },
      {
        ...baseScenes[5],
        kicker: "Line five | AI supply chain",
        title: "Samsung shows the labor side of AI",
        body: "The AI boom is also happening in chip factories, union negotiations, and profit-sharing fights.",
        notes: ["Chip fabs", "Labor talks", "AI profits"],
        voiceover: ["The fourth line was the real-world cost behind the AI boom. Samsung Electronics faced strike risk over bonuses, pay, and profit sharing during a surge in AI-chip demand. South Korea's government stepped in because Samsung is not just one company. It is a major node in Korean exports and in the global semiconductor supply chain.", "AI is not only a story about model launches. It is also a story about factories, unions, and who captures the profits when chip demand rises. Workers, companies, governments, and customers are all renegotiating who gets the gains and who carries disruption risk."],
      },
      {
        ...baseScenes[6],
        kicker: "Line six | Public health",
        title: "Ebola, hantavirus, extreme weather",
        body: "Global risk also comes from disease, climate, and cross-border movement, not only war and trade.",
        notes: ["Public health", "Cross-border movement", "Extreme weather"],
        voiceover: ["Finally, public health and climate reminded us that risk did not pause. WHO declared the Ebola outbreak in the Democratic Republic of the Congo and Uganda a public health emergency of international concern. In the same week, Andes hantavirus infections linked to a South America cruise drew attention, while severe storms in Uttar Pradesh caused heavy casualties."],
      },
      {
        ...baseScenes[7],
        kicker: "Wrap",
        title: "High risk, but still negotiating",
        body: "Beijing negotiated, Taiwan faced pressure, the Gulf burned, Ukraine drone warfare widened, and AI profits were contested.",
        notes: ["Talks", "Spillover", "Redistribution"],
        voiceover: ["So the week can be summarized this way: Beijing was negotiating, Taiwan was under pressure, the Gulf was still burning, Ukraine's war was becoming more drone-driven, and the AI supply chain was renegotiating profit distribution. These looked like separate stories. Underneath, they pointed to one problem: the global order is trying to regain stability, while risk spreads at the same time through war, energy, technology, and public health. This is Codex Guanlan. We'll keep reading the world across the lines next week."],
      },
    ],
  },
};

let profile = localeProfiles["zh-CN"];
let scenes = profile.scenes;

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

const footageSourcingTargets = [
  {
    provider: "Reuters",
    priority: "licensed_or_embeddable_if_available",
    use: "US-China Beijing talks, Taiwan/WHA diplomacy, Gulf energy and oil-market footage, Samsung labour and semiconductor footage.",
    note: "Use only through a valid license, subscription, or explicit embed/republication permission shown by the provider.",
  },
  {
    provider: "AP",
    priority: "licensed_or_embeddable_if_available",
    use: "Ukraine drone-war aftermath, China-US trade/agriculture visuals, public-health explainers, and breaking-news footage packages.",
    note: "Use only through a valid license, subscription, or explicit embed/republication permission shown by the provider.",
  },
  {
    provider: "UN / WHO / IMF / World Bank media libraries",
    priority: "preferred_public_media",
    use: "Public-health, humanitarian, economic, and institution-room visuals when the source page marks reuse or embed terms.",
    note: "Capture the source URL and reuse statement with each downloaded or embedded asset.",
  },
  {
    provider: "Government and official public-domain media",
    priority: "preferred_public_domain",
    use: "US DoD, NASA, NOAA, CDC, EU, national ministries, public briefings, maps, b-roll, and data visuals.",
    note: "Prefer assets explicitly marked public domain, open license, or press/media reuse.",
  },
  {
    provider: "Public broadcasters and international public-media desks",
    priority: "case_by_case_public_or_embeddable",
    use: "Openly licensed, embeddable, or press-use video from public broadcasters and international public-media organizations.",
    note: "Do not assume reuse; keep only assets whose page labels permit publication or embedding.",
  },
  {
    provider: "Wikimedia Commons",
    priority: "fallback_only",
    use: "Reality-based stills or public-media video when licensed footage is unavailable.",
    note: "Do not rely on Wikimedia as the only visual source for future productions.",
  },
];

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
      <text x="134" y="948" font-family="${fontFamily}" font-size="25" fill="#f8f1df">${esc(profile.footer)}</text>
    </g>
    <text x="1620" y="974" font-family="${fontFamily}" font-size="28" fill="#f8f1df">${index + 1}/${scenes.length}</text>
  </svg>`;
}

function coverSvg() {
  const titleLines = wrapText(profile.articleTitle, profile.suffix === "en" ? 24 : 14);
  const title = titleLines.map((line, index) =>
    `<text x="132" y="${418 + index * 94}" font-family="${fontFamily}" font-size="${profile.suffix === "en" ? 70 : 78}" font-weight="700" fill="#fbfbf5">${esc(line)}</text>`
  ).join("");
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cover-v" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#000" stop-opacity="0.76"/>
        <stop offset="0.58" stop-color="#000" stop-opacity="0.38"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.72"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#cover-v)"/>
    <rect x="94" y="138" width="560" height="58" rx="4" fill="#f8df7e" opacity="0.96"/>
    <text x="124" y="176" font-family="${fontFamily}" font-size="28" fill="#151515">${esc(profile.coverKicker)}</text>
    ${title}
    <rect x="128" y="860" width="650" height="60" rx="5" fill="#101820" opacity="0.9"/>
    <text x="156" y="899" font-family="${fontFamily}" font-size="27" fill="#f8f1df">${esc(profile.footer)}</text>
    <text x="132" y="794" font-family="${fontFamily}" font-size="30" fill="#fff2bc">${esc(weekStart)} / ${esc(weekEnd || weekStart)}</text>
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

function splitSubtitleText(text, maxChars = profile.suffix === "en" ? 46 : 18) {
  const sentencePattern = profile.suffix === "en" ? /(?<=[.!?;])\s+/ : /(?<=[。；？！])/;
  const breakPattern = profile.suffix === "en" ? /[\s,.;:!?]/ : /[，。；：、]/;
  const minChars = profile.suffix === "en" ? 26 : 10;
  const sentences = text
    .replaceAll("\n", " ")
    .split(sentencePattern)
    .map((item) => item.trim())
    .filter(Boolean);
  const items = [];
  for (const sentence of sentences) {
    let current = "";
    for (const char of sentence) {
      current += char;
      if ((current.length >= minChars && breakPattern.test(char)) || current.length >= maxChars) {
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

function vtt() {
  return `WEBVTT\n\n${captionEntries()
    .map(([, start, end, text]) => `${ts(start).replace(",", ".")} --> ${ts(end).replace(",", ".")}\n${text}\n`)
    .join("\n")}`;
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

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
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

async function makeCover() {
  const basePath = path.join(realDir, scenes[0].image);
  const overlay = await sharp(Buffer.from(coverSvg())).png().toBuffer();
  return sharp(basePath)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .modulate({ brightness: 0.72, saturation: 0.9 })
    .blur(0.3)
    .composite([{ input: overlay, blend: "over" }])
    .webp({ quality: 92 })
    .toBuffer();
}

async function renderSegment(scene, index) {
  const number = String(index + 1).padStart(2, "0");
  const segmentPath = path.join(segmentsDir, `scene-${number}.mp4`);
  const visualPath = path.join(segmentsDir, `scene-${number}.visual.mp4`);
  const fadeOutStart = Math.max(0, scene.dur - 0.35).toFixed(2);
  if (!argFlag("force-video") && !argFlag("force-audio") && await exists(segmentPath)) {
    const existingDuration = await mediaDuration(segmentPath).catch(() => 0);
    if (existingDuration >= scene.dur - 0.25) {
      console.log(`Reusing ${path.relative(rootDir, segmentPath)}`);
      return segmentPath;
    }
  }

  console.log(`Rendering scene ${number}/${String(scenes.length).padStart(2, "0")} (${profile.suffix})`);
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
  const forceAudio = argFlag("force-audio") || process.env.NEWS_TTS_FORCE === "1";
  const text = scene.voiceover.join("\n\n");
  await fs.writeFile(textPath, text, "utf8");

  const edgeEndpoint = argValue("tts-endpoint") || process.env.NEWS_TTS_ENDPOINT || process.env.EDGE_WORKER_TTS_ENDPOINT || defaultTtsEndpoint;
  if (edgeEndpoint) {
    const edgePath = path.join(audioDir, `scene-${number}.edge.mp3`);
    if (!forceAudio && await exists(edgePath)) {
      try {
        await auditAudio(edgePath, textPath, number);
        scene.audioPath = edgePath;
        scene.dur = Math.max(8, Math.round((await mediaDuration(edgePath) + 0.6) * 10) / 10);
        console.log(`Reusing ${path.relative(rootDir, edgePath)}`);
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
        `--endpoint=${edgeEndpoint}`,
        `--voice=${profile.voice}`,
      ], { cwd: rootDir, maxBuffer: 1024 * 1024 * 4 });
      await auditAudio(edgePath, textPath, number);
      scene.audioPath = edgePath;
      scene.dur = Math.max(8, Math.round((await mediaDuration(edgePath) + 0.6) * 10) / 10);
      return;
    } catch (error) {
      console.warn(`Edge Worker TTS failed audit for scene ${number}: ${error.message}`);
      if (!argFlag("allow-local-tts") && process.env.NEWS_TTS_ALLOW_LOCAL !== "1") {
        throw new Error(`Online Edge/Azure TTS is required for scene ${number}. Re-run with --allow-local-tts only for temporary drafts.`);
      }
    }
  }

  await execFileAsync("espeak-ng", [
    "-v", profile.espeak,
    "-s", "155",
    "-p", "35",
    "-w", localPath,
    "-f", textPath,
  ], { maxBuffer: 1024 * 1024 * 2 });
  await auditAudio(localPath, textPath, number);
  scene.audioPath = localPath;
  scene.dur = Math.max(8, Math.round((await mediaDuration(localPath) + 0.6) * 10) / 10);
  console.log(`Generated ${path.relative(rootDir, localPath)}`);
}

async function auditAudio(audioPath, textPath, number) {
  const [duration, volume] = await Promise.all([
    mediaDuration(audioPath),
    execFileAsync("ffmpeg", [
      "-v", "info",
      "-i", audioPath,
      "-af", "volumedetect",
      "-f", "null",
      "-",
    ], { maxBuffer: 1024 * 1024 * 4 }).catch((error) => error),
  ]);
  const stderr = volume.stderr || "";
  const mean = Number(stderr.match(/mean_volume:\s*(-?\d+(?:\.\d+)?) dB/)?.[1] ?? -99);
  if (!Number.isFinite(duration) || duration < 2) {
    throw new Error(`Audio audit failed for scene ${number}: duration ${duration}`);
  }
  if (!Number.isFinite(mean) || mean < -45) {
    throw new Error(`Audio audit failed for scene ${number}: mean volume ${mean} dB`);
  }
}

async function main() {
  await loadLocalEnv();
  const locale = argValue("locale") || process.env.NEWS_MVP_LOCALE || "zh-CN";
  profile = await loadSceneProfile(locale) ?? localeProfiles[locale];
  if (!profile) throw new Error(`Unsupported locale: ${locale}`);
  scenes = profile.scenes.map((scene) => ({ ...scene, voiceover: [...scene.voiceover], notes: [...scene.notes] }));
  outDir = path.join(baseOutDir, profile.suffix);
  framesDir = path.join(outDir, "frames");
  segmentsDir = path.join(outDir, "segments");
  audioDir = path.join(outDir, "audio");
  await fs.mkdir(framesDir, { recursive: true });
  await fs.mkdir(segmentsDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.rm(path.join(outDir, "generated-cover.png"), { force: true });
  const final = path.join(outDir, profile.videoFile);
  const voiceover = voiceoverText();
  await fs.writeFile(path.join(outDir, profile.voiceoverFile), voiceover, "utf8");
  await fs.writeFile(path.join(outDir, profile.voiceoverFile.replace(/\.md$/, ".txt")), voiceover, "utf8");
  for (let i = 0; i < scenes.length; i++) {
    await prepareSceneAudio(scenes[i], i);
  }

  for (let i = 0; i < scenes.length; i++) {
    const framePath = path.join(framesDir, `scene-${String(i + 1).padStart(2, "0")}.webp`);
    if (!argFlag("force-frames") && await exists(framePath)) continue;
    const image = await makeFrame(scenes[i], i);
    await fs.writeFile(framePath, image);
  }
  for (let i = 0; i < scenes.length; i++) {
    await renderSegment(scenes[i], i);
  }
  await fs.writeFile(path.join(outDir, "cover.webp"), await makeCover());
  await fs.writeFile(path.join(outDir, profile.srtFile), srt(), "utf8");
  const vttText = vtt();
  await fs.writeFile(path.join(outDir, profile.vttFile), vttText, "utf8");
  await fs.mkdir(path.join(rootDir, "static/news"), { recursive: true });
  await fs.writeFile(path.join(rootDir, "static/news", profile.vttFile), vttText, "utf8");
  await fs.writeFile(path.join(outDir, "ATTRIBUTION.json"), JSON.stringify({
    actualAssets: attributions,
    futureFootageSourcingTargets: footageSourcingTargets,
  }, null, 2), "utf8");
  await fs.writeFile(path.join(outDir, "shotlist.csv"), [
    "timecode_start,timecode_end,segment,visual_keywords,caption,source_type,license_note",
    ...scenes.map((scene, i) => {
      const start = scenes.slice(0, i).reduce((sum, item) => sum + item.dur, 0);
      const end = start + scene.dur;
      const attr = attributions[scene.sourceId];
      const videoAttr = scene.videoSourceId ? attributions[scene.videoSourceId] : null;
      const sourceType = videoAttr ? "reality_based_video" : "reality_based_image";
      const licenseNote = videoAttr
        ? `${attr.file}; ${attr.license}; ${attr.source} | ${videoAttr.file}; ${videoAttr.license}; ${videoAttr.source}`
        : `${attr.file}; ${attr.license}; ${attr.source}`;
      return [
        ts(start).replace(",", "."),
        ts(end).replace(",", "."),
        csvCell(scene.title),
        csvCell(scene.notes.join("; ")),
        csvCell(scene.body),
        csvCell(sourceType),
        csvCell(licenseNote),
      ].join(",");
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
