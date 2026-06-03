---
title: "一覺醒來，Windows Codex Desktop 的 Browser 和 Computer Use 都不可用了：如何請 Codex 自己修好"
description: "面向新手使用者和接手排障的 Codex：電腦休眠後 Browser、Computer Use 與智慧沙盒不可用時，如何用提示詞和檢查順序修回來。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "開發效率"
draft: false
cover: "https://files.js.gripe/files/fil_YXO7OF0wuOmNcp6rBm95_LeN.png"
---

一覺醒來，Windows 還在，Codex Desktop 也還在，但 Browser 和 Computer Use 都不在了。Codex Desktop 的 Browser 顯示「應用內瀏覽器外掛不可用」，Computer Use 也連不上。單純關閉再打開 Codex Desktop 沒有立即解決，因為底層其實同時壞了幾段鏈路。

這篇可以當成給新手使用者和另一個 Codex 的排障提示詞。不要一開始就刪整個 `.codex`，先讓 Codex 只讀檢查外掛來源、快取檔案、Chrome native host、智慧沙盒 helper，再決定要修哪裡。

![Codex Desktop Browser 顯示應用內瀏覽器外掛不可用](https://files.js.gripe/files/fil_YXO7OF0wuOmNcp6rBm95_LeN.png)

![Codex Desktop 本地主機模式下 Browser 仍顯示不可用](https://files.js.gripe/files/fil_3ouI8a_WUW2DtHOqxPgWWYN2.png)

![Codex Desktop 修復鏈路](https://files.js.gripe/files/raw/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg)

最後的恢復順序是：補回 `openai-bundled` marketplace，重新安裝 Browser、Chrome、Computer Use 外掛，重建 Chrome 的 `latest` junction，修復 `.sandbox-bin` 裡的 `codex-command-runner`，再重啟 Codex Desktop 讓 native pipe 重新注入。

## 先把這段話交給 Codex

```text
我的 Windows Codex Desktop 在休眠/喚醒後，Browser 或 Computer Use 顯示不可用。請先只讀檢查，不要刪檔，不要重置。

請依序檢查 openai-bundled marketplace、browser/chrome/computer-use 外掛、browser-client.mjs、computer-use-client.mjs、Chrome latest junction、chrome-native-hosts-v2.json、.sandbox-bin 裡的 codex-command-runner、舊 helper 進程、codex doctor、sandbox smoke test，以及是否需要重啟 Codex Desktop 讓 native pipe 重新注入。

也請排查維護腳本是否誤刪 .codex\plugins、.codex\.tmp\bundled-marketplaces、.codex\.sandbox-bin。
```

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

![恢復檢查清單](https://files.js.gripe/files/raw/fil_BkYkqKeAVDyUo-7ADqoUrHMt.svg)

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
