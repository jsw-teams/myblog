---
title: "一觉醒来，Windows Codex Desktop 的 Browser 和 Computer Use 都不可用了：直接让 Codex 接手修"
description: "面向小白用户和接手排障的 Codex：电脑休眠后 Codex Desktop Browser、Computer Use 和智能沙盒不可用时，如何用“替我审批”模式把现场交给 Codex 修回来。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "开发效率"
draft: false
cover: "https://files.js.gripe/files/fil_YXO7OF0wuOmNcp6rBm95_LeN.png"
---

一觉醒来，Windows 还在，Codex Desktop 也还在，但 Browser 和 Computer Use 都不在了。设置页能打开，浏览器页上只有“应用内浏览器插件不可用”，电脑操控也连不上。更扎心的是，关掉 Codex Desktop 再打开一次，还是没好。

这篇不是写给会熟练拆 `.codex` 目录的人看的，而是写给两类人：第一类是刚遇到这个问题的小白用户，第二类是被你喊来接手的另一个 Codex。你不需要自己去猜哪个目录坏了，也不需要照着陌生命令一行一行复制。更好的办法是把现场交给 Codex，让它自己读状态、判断问题、修文件、重启该重启的组件，最后给你一个能复用的修复记录。

这次实际用的是“替我审批”模式：常规检查和常规修复让 Codex 自己推进，比如补回缺失插件、修复链接、停止明确卡住的旧 helper、跑验证命令；只有删除整目录、清空 `.codex`、重装 Codex、批量杀进程这类可能扩大影响的动作，才停下来问你。

原始故障截图先保留在这里，因为它们比任何描述都直接：

![Codex Desktop Browser 显示应用内浏览器插件不可用](https://files.js.gripe/files/fil_YXO7OF0wuOmNcp6rBm95_LeN.png)

![Codex Desktop 本地主机模式下 Browser 仍显示不可用](https://files.js.gripe/files/fil_3ouI8a_WUW2DtHOqxPgWWYN2.png)

下面这张图是这次修复链路的简化版。蓝色助手代表接手排障的 Codex，黑熊代表旁边看着屏幕、只在关键动作上点头的人类用户。

![Codex Desktop 修复链路：Codex 接手，用户只审批高风险动作](/news/codex-recovery-flow.svg)

## 先把这段话丢给 Codex

如果你不想先理解所有细节，可以直接复制这段。它的意思很简单：别让我自己乱点了，请你作为 Codex 直接接手排障和修复，并用“替我审批”的方式推进。

```text
我的 Windows Codex Desktop 在电脑休眠/唤醒后坏了：设置页显示 Browser 或 Computer Use 不可用，Browser 页面可能提示“应用内浏览器插件不可用”，Computer Use 可能提示 native pipe path 不可用，普通 shell 可能还能跑。

请你直接接手修复，采用“替我审批”的模式推进：常规检查、补文件、修链接、重装缺失插件、停止明确卡住的旧 helper、运行验证命令，都由你判断后直接做；只有删除整目录、重装 Codex、清空 .codex、大规模 kill 进程这类高风险动作，才需要先问我。

请优先排查并修复这些点：
1. %USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled 是否缺失或不完整；
2. browser@openai-bundled、chrome@openai-bundled、computer-use@openai-bundled 是否安装完整；
3. browser-client.mjs、computer-use-client.mjs 是否真实存在；
4. Chrome 插件目录下 latest junction 是否断了，是否指向真实版本目录；
5. chrome-native-hosts-v2.json 里的路径是否落到真实文件；
6. %USERPROFILE%\.codex\.sandbox-bin 里的 codex-command-runner 是否存在、版本是否对；
7. 是否有旧的 codex-command-runner 进程占用或卡住；
8. codex doctor --summary 和一个 sandbox smoke test 是否通过；
9. Windows 自动睡眠/休眠是否会再次打断这些 helper；
10. 修完底层文件后，请提醒我重启 Codex Desktop，或者在我同意后帮我重启，让 Browser / Computer Use 的 native pipe 重新注入。

请同时检查本机维护脚本有没有清理 .codex\plugins、.codex\.tmp\bundled-marketplaces、.codex\.sandbox-bin。修完后告诉我：坏在哪里、你改了哪里、怎么验证通过、以后再坏怎么一键复查。
```

这段提示词的重点不是把 Codex 限制成只会检查的工具，而是把目标讲清楚：你来接手，你来判断，你来修。所谓“替我审批”，就是把小白用户不该自己判断的细碎选择交给 Codex，同时保留一条红线：删除整目录、清空缓存、重装应用、批量杀进程这种可能扩大影响的动作，要停下来问一句。

## 小白别自己硬拆，让 Codex 接管

遇到这种情况时，最容易做错的事不是“没动手”，而是自己动太快：连续乱点重装、清空所有数据、删除整个 `.codex` 目录，或者把 Chrome 也一起卸载。它们看起来像“大力出奇迹”，但可能把原本可以恢复的状态变得更乱。

更稳的方式是让 Codex 用“替我审批”的方式接管，而不是让你自己当半吊子运维：

```text
请你接手处理这个 Codex Desktop 故障，替我审批常规修复动作。先判断是哪一层坏了，然后直接修复能安全修复的部分。需要删除整目录、重装、清空缓存或杀大量进程时再问我。请不要只给建议，能做的请直接做，并在每一步后验证。
```

这一句会让另一个 Codex 明白：它不是来写建议书的，是来修现场的。

## 这次到底坏在哪里

这次不是单一故障，而是几层状态同时歪了：

```text
Browser 插件不可用
Computer Use native pipe 不可用
openai-bundled 插件源和缓存不完整
Chrome latest junction 断裂
智能沙盒 helper 被旧进程或损坏状态卡住
```

所以只重启一次 Codex Desktop 不一定够。重启只能刷新 UI 进程，不能凭空补回丢失的插件文件，也不会自动修好断掉的 junction，更不会替你处理 `.sandbox-bin` 里的 helper。

真正的修复顺序是：先让 Codex 看清现场，再把文件、链接、helper、桌面端进程四层都修回来。

## 第一步：恢复 openai-bundled 插件源

Browser、Chrome、Computer Use 不是三个孤立按钮，它们依赖 Codex 本地的 bundled marketplace。排查时发现 `openai-bundled` 相关资源不完整。这个状态下，设置页可能还能显示一些插件信息，但真正需要的脚本文件已经不在。

Codex 需要检查这两个位置：

```text
Codex 安装资源:
C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\plugins\openai-bundled

恢复目标:
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
```

如果 bundled marketplace 缺失，就从 Codex 安装资源里补回去，再重新注册 marketplace，并重新安装这些插件：

```text
browser@openai-bundled
chrome@openai-bundled
computer-use@openai-bundled
```

修复后重点看这些文件是否真实存在：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

如果这些文件不存在，Browser 页面再怎么刷新也不会稳定恢复。

## 第二步：修 Chrome latest junction

Chrome 插件还有一层 native host 配置。排查时版本目录存在，但 `latest` 路径没有正确指向当前版本，导致配置里引用的脚本路径落空。

需要修回类似这样的 junction：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

然后再确认 `chrome-native-hosts-v2.json` 里的路径能落到真实文件。这里很容易误判：插件目录在，不代表 `latest` 一定在；native host 配置文件在，也不代表它指向的脚本还活着。

## 第三步：修智能沙盒 helper

Browser 文件恢复后，Windows 智能沙盒还可能继续报这种底层错误：

```text
CreateProcessWithLogonW failed: 5
```

这说明普通 sandbox shell 的启动链路也受影响。继续查到 `.sandbox-bin` 里的 `codex-command-runner` 状态不对，而且有旧 helper 进程占用。

处理顺序是：

```text
1. 找到旧的 codex-command-runner 进程
2. 确认它确实是 stale helper，而不是正在工作的任务
3. 停止旧 helper
4. 从 Codex AppData 里恢复 runner 到 .sandbox-bin
5. 跑 sandbox smoke test
6. 跑 codex doctor --summary
```

这一步适合交给 Codex 做，因为它比小白更适合判断“这个进程是不是该停”。但如果它准备批量杀一堆进程，就应该停下来问你。

## 第四步：重启 Codex Desktop

文件恢复以后，Browser API 可能已经能跑通，但 Computer Use 仍然提示 native pipe path 不可用。这时不要继续乱清缓存，应该重启 Codex Desktop。

原因是 Browser 和 Computer Use 都需要桌面端进程向当前会话注入 native pipe 路径。插件文件修好后，已经运行的 UI 不一定自动重建这条连接。最终通过重启 Codex Desktop，Browser 和 Computer Use 才在 UI 里恢复可用。

这也解释了为什么用户手动关开一次之前没有效果：当时底层文件和 sandbox helper 还没全部恢复，重启只是在坏状态上重新加载了一遍。

## 第五步：防止它睡回坏状态

这次问题由休眠后状态漂移触发，所以顺手检查 Windows 电源策略。`STANDBYIDLE` 和 `HIBERNATEIDLE` 的 AC / DC 值都改成了 `0x00000000`，也就是不自动睡眠、不自动休眠。

这不是根治插件缓存损坏的唯一手段，但能降低同类中断：Codex Desktop、Browser native host、Computer Use pipe、sandbox helper 这些组件都更怕“机器睡过去再半醒不醒地回来”。

## 第六步：回头查维护脚本

恢复后还要看本机维护脚本有没有误伤 Codex 必要文件。重点是有没有脚本清理这些目录：

```text
.codex\plugins
.codex\.tmp\bundled-marketplaces
.codex\.sandbox-bin
```

这次没有发现维护脚本删除 `browser-client.mjs` 或 `computer-use-client.mjs` 的证据：

```text
CodexBrightnessGuard:
只做亮度守护，不清理插件缓存。

OptimizeDevice.ps1:
Remove-Item 只指向 TEMP 和 Windows Temp 的旧文件。

RunIntegrityCheck.ps1:
只清理自己的 stdout / stderr 临时文件。
```

所以这次更像是 Codex bundled marketplace / 插件缓存处在半同步、半损坏状态，而不是本机维护脚本主动清掉了关键文件。当然，后续如果要继续加固，建议把 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces`、`.codex\.sandbox-bin` 明确加入维护脚本的保护名单。

## 给接手 Codex 的检查顺序

下面这张图是给“下一位接手排障的 Codex”看的。它不是装饰图，而是一份压缩版 runbook。

![恢复检查清单：替我审批模式下的 Codex 排障顺序](/news/codex-recovery-checklist.svg)

文字版顺序如下：

```text
1. 看 UI 现象：Browser、Computer Use、sandbox 哪些不可用
2. 查 openai-bundled marketplace 是否完整
3. 查 browser / chrome / computer-use 插件缓存
4. 查 browser-client.mjs / computer-use-client.mjs
5. 修 Chrome latest junction 和 native host 配置
6. 查 .sandbox-bin 和 codex-command-runner
7. 停止明确卡住的旧 helper
8. 跑 codex doctor --summary
9. 跑 sandbox smoke test
10. 重启 Codex Desktop，让 native pipe 重新注入
11. 查 Windows 睡眠/休眠策略
12. 查维护脚本是否误删 Codex 目录
```

这次最重要的经验是：不要只盯着设置页的“不可用”三个字。Codex Desktop 的 Browser、Computer Use 和智能沙盒是三条相互关联但不完全相同的链路。把文件、链接、helper、桌面端进程四层都修好，UI 才会真正恢复。
