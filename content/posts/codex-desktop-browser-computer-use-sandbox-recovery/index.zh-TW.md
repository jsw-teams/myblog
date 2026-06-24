---
title: "一覺醒來，Windows Codex Desktop 的 Browser 和 Computer Use 都不可用了：直接讓 Codex 接手修"
description: "電腦休眠後 Codex Desktop Browser、Computer Use 和智慧沙盒不可用時，把現場交給 Codex 接手排障和修復。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "開發效率"
draft: false
---

一覺醒來，Windows 還在，Codex Desktop 也還在，但 Browser 和 Computer Use 都不在了。設定頁能開，瀏覽器頁面只剩「應用內瀏覽器外掛不可用」，電腦操控也連不上。

這篇寫給剛遇到問題的使用者，以及接手排障的 Codex。重點不是讓使用者照著命令一步一步拆 `.codex`，而是把現場交給 Codex：讓它讀狀態、判斷問題、修復檔案、重啟該重啟的元件，最後留下可重用的修復紀錄。

原始故障截圖保留如下：




## 修復腳本下載

如果你想先嘗試常規修復，可以下載這個 Windows 批次檔：


請在 Windows 上按右鍵選擇「以系統管理員身分執行」。溫馨提示：腳本會關閉 Google Chrome，請先保存瀏覽器裡的工作內容、表單和未送出的頁面。腳本不會重裝 Codex；它主要用於恢復 bundled 外掛資源、修復 Browser / Computer Use 相關設定和 helper，並在結束後提示你重啟 Codex Desktop、重新開啟設定頁觸發外掛枚舉。

## 先把現場交給 Codex

可以把下面這段交給 Codex，讓它直接接手修復：

```text
我的 Windows Codex Desktop 在電腦休眠/喚醒後壞了：設定頁顯示 Browser 或 Computer Use 不可用，Browser 頁面可能提示「應用內瀏覽器外掛不可用」，Computer Use 可能提示 native pipe path 不可用，普通 shell 可能還能跑。

請你直接接手修復。先判斷是哪一層壞了，再主動完成常規檢查和常規修復：補檔案、修連結、恢復缺失外掛、停止明確卡住的舊 helper、執行驗證命令。只有刪除整個目錄、重裝 Codex、清空 .codex、大規模 kill 程序這類高風險動作，才需要先問我。

修完後請告訴我：壞在哪裡、你改了哪裡、怎麼驗證通過、以後再壞怎麼一鍵複查。
```

## 第一步：先看 openai-bundled 和外掛快取

Browser、Chrome、Computer Use 依賴 Codex 本機的 bundled marketplace。這次排查時，`openai-bundled` 相關資源不完整，導致真正需要的 client script 缺失或路徑落空。

Codex 需要優先確認：

```text
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

可選但建議放在第一步一起看：本機維護腳本有沒有清理 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces` 或 `.codex\.sandbox-bin`。

## 第二步：修 Chrome latest junction

Chrome 外掛還有 native host 設定。版本目錄存在，不代表 `latest` junction 一定正確；native host 設定檔存在，也不代表它指向的 script 還活著。

需要修回類似這樣的 junction：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

再確認 `chrome-native-hosts-v2.json` 裡的路徑能落到真實檔案。

## 第三步：修智慧沙盒 helper

Browser 檔案恢復後，Windows 智慧沙盒仍可能出現：

```text
CreateProcessWithLogonW failed: 5
```

這表示 sandbox shell 的啟動鏈路也受影響。Codex 需要確認 `.sandbox-bin` 裡的 `codex-command-runner` 是否存在、版本是否正確，並判斷舊 helper 程序是否卡住。明確 stale 的 helper 可以停止，再從 Codex AppData 恢復 runner，最後跑 `codex doctor --summary` 和 sandbox smoke test。

## 第四步：重啟 Codex Desktop

底層檔案修好後，Browser API 可能先恢復，但 Computer Use 仍可能提示 native pipe path 不可用。這時要重啟 Codex Desktop，讓桌面端把 Browser / Computer Use 的 native pipe 路徑重新注入目前會話。

這次的關鍵經驗是：不要只看設定頁的「不可用」。把檔案、連結、helper、桌面端進程四層都修回來，UI 才會真正恢復。
