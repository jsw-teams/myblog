---
title: "Codex Desktop 休眠後 Browser / Computer Use 不可用：一次外掛快取與智慧沙盒修復記錄"
description: "記錄電腦休眠後 Codex Desktop 應用內瀏覽器、Computer Use 與 Windows 智慧沙盒不可用的排查與恢復過程。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "開發效率"
draft: false
cover: "https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg"
---

這次問題發生在電腦休眠再喚醒之後：Codex Desktop 的 Browser 顯示「應用內瀏覽器外掛不可用」，Computer Use 也連不上。單純關閉再打開 Codex Desktop 沒有立即解決，因為底層其實同時壞了幾段鏈路。

![Codex Desktop 修復鏈路](https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg)

最後的恢復順序是：補回 `openai-bundled` marketplace，重新安裝 Browser、Chrome、Computer Use 外掛，重建 Chrome 的 `latest` junction，修復 `.sandbox-bin` 裡的 `codex-command-runner`，再重啟 Codex Desktop 讓 native pipe 重新注入。

## 排查重點

這類狀況容易被誤判成 UI 沒刷新，但這次不是單點問題。實際上同時看到了外掛快取缺失、Chrome native host 路徑斷裂，以及 Windows 智慧沙盒 helper 被舊狀態卡住。

恢復 `openai-bundled` 後，重點確認以下檔案存在：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

Chrome 外掛還需要 `latest` 指到真實版本目錄，否則 `chrome-native-hosts-v2.json` 會引用到不存在的路徑。

## 智慧沙盒

沙盒層曾出現：

```text
CreateProcessWithLogonW failed: 5
```

後續處理是停止舊的 `codex-command-runner` helper，並把 Codex AppData 中的 runner 重新複製到 `.codex\.sandbox-bin`。修復後，sandbox smoke test 與 `codex doctor --summary` 都恢復健康。

![恢復檢查清單](https://files.js.gripe/files/fil_BkYkqKeAVDyUo-7ADqoUrHMt.svg)

## 為什麼最後還要重啟

檔案恢復後，Browser API 已經能通，但 Computer Use 仍提示 native pipe path 不可用。這時候需要重啟 Codex Desktop，因為已執行的桌面端行程不一定會自動重建 Browser / Computer Use 所需的 native pipe。

之前手動重啟沒有用，是因為當時外掛檔案、Chrome latest、sandbox helper 還沒有修完整。重啟必須放在底層狀態修好之後。

## 維護腳本排查

也順手檢查了本機維護腳本，沒有看到它們刪除 `.codex\plugins`、`browser-client.mjs` 或 `computer-use-client.mjs` 的證據。`CodexBrightnessGuard` 只做亮度守護；`OptimizeDevice.ps1` 清理的是 TEMP 與 Windows Temp 舊檔；`RunIntegrityCheck.ps1` 只清理自己的 stdout / stderr。

因此這次更像是 bundled marketplace 或外掛快取進入半損壞狀態，而不是維護腳本惡意清掉必要檔案。後續仍建議把 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces`、`.codex\.sandbox-bin` 加入維護腳本保護名單。

## 可復用順序

```text
1. 檢查 Browser / Computer Use 設定頁狀態
2. 補回 openai-bundled marketplace
3. 重裝 browser、chrome、computer-use
4. 確認 client 腳本存在
5. 修復 Chrome latest junction
6. 修復 .sandbox-bin 的 command-runner
7. 跑 codex doctor 與 sandbox smoke test
8. 關閉 Windows 自動睡眠 / 休眠
9. 重啟 Codex Desktop
10. 回頭審計維護腳本
```

這次的結論是：Browser、Computer Use 和智慧沙盒不是同一個開關。只有把外掛檔案、native host 路徑、sandbox helper、桌面端 native pipe 都修好，UI 才會真正恢復。
