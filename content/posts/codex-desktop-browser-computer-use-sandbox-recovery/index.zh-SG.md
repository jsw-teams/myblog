---
title: "一觉醒来，Windows Codex Desktop 的 Browser 和 Computer Use 都不可用了：直接让 Codex 接手修"
description: "电脑休眠后 Codex Desktop Browser、Computer Use 和智能沙盒不可用时，把现场交给 Codex 接手排障和修复。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "开发效率"
draft: false
---

一觉醒来，Windows 还在，Codex Desktop 也还在，但 Browser 和 Computer Use 都不在了。设置页能开，浏览器页面只剩“应用内浏览器插件不可用”，电脑操控也连不上。

这篇写给刚遇到问题的用户，以及接手排障的 Codex。重点不是让用户照着命令一步一步拆 `.codex`，而是把现场交给 Codex：让它读状态、判断问题、修复文件、重启该重启的组件，最后留下可重用的修复记录。

原始故障截图保留如下：

## 修复脚本下载

如果你想先尝试常规修复，可以下载这个 Windows 批次档：


请在 Windows 上按右键选择“以系统管理员身份执行”。温馨提示：脚本会关闭 Google Chrome，请先保存浏览器里的工作内容、表单和未送出的页面。脚本不会重装 Codex；它主要用于恢复 bundled 插件资源、修复 Browser / Computer Use 相关设置和 helper，并在结束后提示你重启 Codex Desktop、重新开启设置页触发插件枚举。

## 先把现场交给 Codex

可以把下面这段交给 Codex，让它直接接手修复：

```text
我的 Windows Codex Desktop 在电脑休眠/唤醒后坏了：设置页显示 Browser 或 Computer Use 不可用，Browser 页面可能提示“应用内浏览器插件不可用”，Computer Use 可能提示 native pipe path 不可用，普通 shell 可能还能跑。

请你直接接手修复。先判断是哪一层坏了，再主动完成常规检查和常规修复：补文件、修链接、恢复缺失插件、停止明确卡住的旧 helper、执行验证命令。只有删除整个目录、重装 Codex、清空 .codex、大规模 kill 程序这类高风险动作，才需要先问我。

修完后请告诉我：坏在哪里、你改了哪里、怎么验证通过、以后再坏怎么一键复查。
```

## 第一步：先看 openai-bundled 和插件缓存

Browser、Chrome、Computer Use 依赖 Codex 本机的 bundled marketplace。这次排查时，`openai-bundled` 相关资源不完整，导致真正需要的 client script 缺失或路径落空。

Codex 需要优先确认：

```text
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

可选但建议放在第一步一起看：本机维护脚本有没有清理 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces` 或 `.codex\.sandbox-bin`。

## 第二步：修 Chrome latest junction

Chrome 插件还有 native host 设置。版本目录存在，不代表 `latest` junction 一定正确；native host 设置档存在，也不代表它指向的 script 还活着。

需要修回类似这样的 junction：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

再确认 `chrome-native-hosts-v2.json` 里的路径能落到真实文件。

## 第三步：修智能沙盒 helper

Browser 文件恢复后，Windows 智能沙盒仍可能出现：

```text
CreateProcessWithLogonW failed: 5
```

这表示 sandbox shell 的启动链路也受影响。Codex 需要确认 `.sandbox-bin` 里的 `codex-command-runner` 是否存在、版本是否正确，并判断旧 helper 程序是否卡住。明确 stale 的 helper 可以停止，再从 Codex AppData 恢复 runner，最后跑 `codex doctor --summary` 和 sandbox smoke test。

## 第四步：重启 Codex Desktop

底层文件修好后，Browser API 可能先恢复，但 Computer Use 仍可能提示 native pipe path 不可用。这时要重启 Codex Desktop，让桌面端把 Browser / Computer Use 的 native pipe 路径重新注入目前会话。

这次的关键经验是：不要只看设置页的“不可用”。把文件、链接、helper、桌面端进程四层都修回来，UI 才会真正恢复。
