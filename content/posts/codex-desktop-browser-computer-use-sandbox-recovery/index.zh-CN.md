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

一觉醒来，Windows 还在，Codex Desktop 也还在，但 Browser 和 Computer Use 都不在了。设置页能打开，浏览器页上只有“应用内浏览器插件不可用”，电脑操控也连不上。更扎心的是，关掉 Codex Desktop 再打开一次，还是没好。

这篇写给两类读者：刚遇到这个问题的用户，以及被叫来接手排障的另一个 Codex。重点不是让用户照着陌生命令逐行操作，而是把现场交给 Codex，让它读状态、判断问题、修文件、重启该重启的组件，最后留下可复用的修复记录。

原始故障截图保留在这里，因为它们比任何描述都直接：

## 修复脚本下载

如果你只想先尝试常规修复，可以下载这个 Windows 批处理脚本：


请在 Windows 上右键选择“以管理员身份运行”。温馨提示：脚本会关闭 Google Chrome，请先保存浏览器里的工作内容、表单和未提交页面。脚本不会重装 Codex；它主要用于恢复 bundled 插件资源、修复 Browser / Computer Use 相关配置和 helper，并在结束后提示你重启 Codex Desktop、重新打开设置页触发插件枚举。

## 先把现场交给 Codex

可以直接把下面这段交给 Codex。它不是让用户学习排障，而是让 Codex 接手现场：

```text
我的 Windows Codex Desktop 在电脑休眠/唤醒后坏了：设置页显示 Browser 或 Computer Use 不可用，Browser 页面可能提示“应用内浏览器插件不可用”，Computer Use 可能提示 native pipe path 不可用，普通 shell 可能还能跑。

请你直接接手修复。先判断是哪一层坏了，再主动完成常规检查和常规修复：补文件、修链接、恢复缺失插件、停止明确卡住的旧 helper、运行验证命令。只有删除整目录、重装 Codex、清空 .codex、大规模 kill 进程这类高风险动作，才需要先问我。

修完后告诉我：坏在哪里、你改了哪里、怎么验证通过、以后再坏怎么一键复查。
```

## 第一步：先看 openai-bundled 和插件缓存

Browser、Chrome、Computer Use 不是三个孤立按钮，它们依赖 Codex 本地的 bundled marketplace。排查时发现 `openai-bundled` 相关资源不完整，设置页虽然还能显示一些插件信息，真正需要的脚本文件却已经缺失或落空。

Codex 需要优先检查这些位置是否完整：

```text
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

可选但建议放在第一步一起看：本机维护脚本有没有清理 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces` 或 `.codex\.sandbox-bin`。这一步不需要用户自己拆目录，交给 Codex 查就好。

## 第二步：修 Chrome latest junction

Chrome 插件还有一层 native host 配置。排查时版本目录存在，但 `latest` 路径没有正确指向当前版本，导致配置里引用的脚本路径落空。

需要修回类似这样的 junction：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

然后再确认 `chrome-native-hosts-v2.json` 里的路径能落到真实文件。

## 第三步：修智能沙盒 helper

Browser 文件恢复后，Windows 智能沙盒还可能继续报底层错误，例如：

```text
CreateProcessWithLogonW failed: 5
```

这说明普通 sandbox shell 的启动链路也受影响。继续查到 `.sandbox-bin` 里的 `codex-command-runner` 状态不对，而且有旧 helper 进程占用。

Codex 需要确认旧进程是否确实卡住，再停止明确 stale 的 helper，从 Codex AppData 里恢复 runner 到 `.sandbox-bin`，然后跑 `codex doctor --summary` 和一个 sandbox smoke test。

## 第四步：重启 Codex Desktop

文件恢复以后，Browser API 可能已经能跑通，但 Computer Use 仍然提示 native pipe path 不可用。这时需要重启 Codex Desktop。

原因是 Browser 和 Computer Use 都需要桌面端进程向当前会话注入 native pipe 路径。插件文件修好后，已经运行的 UI 不一定自动重建这条连接。最终通过重启 Codex Desktop，Browser 和 Computer Use 才在 UI 里恢复可用。

## 这次的结论

这次不是单一故障，而是几层状态同时歪了：`openai-bundled` 插件源和缓存不完整、Chrome `latest` junction 断裂、智能沙盒 helper 卡住、桌面端 native pipe 没有重新注入。只重启一次 Codex Desktop 不一定够，真正有效的是让 Codex 把文件、链接、helper、桌面端进程四层都修回来。
