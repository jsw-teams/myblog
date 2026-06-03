---
title: "Codex Desktop 休眠后 Browser / Computer Use 不可用：一次插件缓存与智能沙盒修复记录"
description: "记录电脑休眠后 Codex Desktop 应用内浏览器、Computer Use 和 Windows 智能沙盒不可用的排查与恢复过程。"
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "开发效率"
draft: false
cover: "https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg"
---

这次问题的触发点很普通：电脑休眠后再唤醒，Codex Desktop 里的 Browser 和 Computer Use 都显示不可用。设置页能打开，但浏览器页上只有“应用内浏览器插件不可用”，电脑操控也连不上。更麻烦的是，单纯把 Codex Desktop 关闭再打开并没有立刻恢复。

![Codex Desktop 修复链路](https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg)

最后恢复的关键不是某一个按钮，而是一组状态一起修好：插件市场源要回来，插件缓存要完整，Chrome native host 的 `latest` 路径要指向真实版本，Windows 智能沙盒的 helper 不能被旧进程锁住，最后还要重启 Codex Desktop，让 Browser 和 Computer Use 的 native pipe 重新注入。

## 现象

Codex Desktop 设置页里，Browser 区域提示应用内浏览器插件不可用。Computer Use 也处于不可用状态。与此同时，普通 shell 和插件注册状态并不完全一致：有些命令能跑，有些插件文件缺失，UI 状态又不会马上刷新。

这类问题容易误判成“只是 UI 没刷新”。但这次实际同时存在三层问题：

```text
插件源 / 缓存不完整
Chrome latest 链接断裂
智能沙盒 helper 被旧进程和损坏文件状态卡住
```

所以只重启一次应用不一定够。重启只能刷新 UI 进程，不能凭空补回丢失的插件文件，也不会自动修好断掉的 junction。

## 恢复 openai-bundled 插件源

先检查 Codex 本地插件目录，发现 `openai-bundled` 相关资源不完整。Browser、Chrome、Computer Use 都依赖这个 bundled marketplace。恢复方式是从 WindowsApps 中已安装的 Codex 包里，把官方 bundled marketplace 重新复制回 Codex home：

```text
Codex 安装资源:
C:\Program Files\WindowsApps\OpenAI.Codex_...\app\resources\plugins\openai-bundled

恢复目标:
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
```

然后重新注册 marketplace，并重新安装三个插件：

```text
browser@openai-bundled
chrome@openai-bundled
computer-use@openai-bundled
```

修复后重点确认这些文件确实存在：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

这一步解决的是“插件本体不完整”的问题。如果这些文件不存在，设置页里再怎么点也不会有稳定结果。

## 修复 Chrome latest 链接

Chrome 插件还额外依赖 native host 配置。排查时发现版本目录存在，但 `latest` 路径没有正确指向当前版本，导致配置里引用的脚本路径失效。

恢复方式是重建类似这样的目录 junction：

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

然后让 `chrome-native-hosts-v2.json` 里的路径重新落到真实文件上。这个细节很容易漏：Chrome 插件本身安装了，不代表 native host 引用的 `latest` 一定还在。

## 修复智能沙盒 helper

Browser 的文件恢复以后，Windows 智能沙盒还报过一类更底层的错误：

```text
CreateProcessWithLogonW failed: 5
```

这说明普通 sandbox shell 的启动链路也受影响。继续查到 `.sandbox-bin` 里的 `codex-command-runner` 状态不对，而且有旧的 helper 进程占用。处理顺序是先停止 stale 的 `codex-command-runner-0.136.0-alpha.2.exe` 进程，再把 Codex AppData 里的 runner 重新复制到：

```text
%USERPROFILE%\.codex\.sandbox-bin\codex-command-runner-0.136.0-alpha.2.exe
```

修复后再跑 sandbox 命令，确认不再出现 `CreateProcessWithLogonW failed: 5`。随后 `codex doctor --summary` 回到健康状态：17 个检查通过、1 个空闲、0 个失败。

![恢复检查清单](https://files.js.gripe/files/fil_BkYkqKeAVDyUo-7ADqoUrHMt.svg)

## 为什么还需要重启 Codex Desktop

文件恢复以后，Browser API 已经能跑通，但 Computer Use 仍然提示 native pipe path 不可用。这一步不是继续清缓存，而是重启 Codex Desktop。

原因是 Browser 和 Computer Use 都需要桌面端进程向当前会话注入 native pipe 路径。插件文件修好后，已运行的 UI 不一定自动重建这条连接。最终通过重启 Codex Desktop，Browser 和 Computer Use 才在 UI 里恢复可用。

这也解释了为什么用户手动关开一次之前没有效果：当时底层文件和 sandbox helper 还没有全部恢复，重启只是在坏状态上重新加载了一遍。

## 防止再次被休眠打断

这次问题由休眠后状态漂移触发，所以顺手检查了 Windows 电源策略。`STANDBYIDLE` 和 `HIBERNATEIDLE` 的 AC / DC 值都改成了 `0x00000000`，也就是不自动睡眠、不自动休眠。

这不是根治插件缓存损坏的唯一手段，但能降低同类中断：Codex Desktop、Browser native host、Computer Use pipe、sandbox helper 这些组件都更怕“机器睡过去再半醒不醒地回来”。

## 维护脚本排查

恢复后还排查了本机维护脚本，重点看有没有脚本恶意或误伤清理 Codex 必要文件。

结果没有发现证据表明维护脚本删除了 `.codex\plugins`、`browser-client.mjs` 或 `computer-use-client.mjs`：

```text
CodexBrightnessGuard:
只做亮度守护，不清理插件缓存。

OptimizeDevice.ps1:
Remove-Item 只指向 TEMP 和 Windows Temp 的旧文件。

RunIntegrityCheck.ps1:
只清理自己的 stdout / stderr 临时文件。
```

所以这次更像是 Codex bundled marketplace / 插件缓存处在半同步、半损坏状态，而不是本地维护脚本主动清掉了关键文件。当然，后续如果要继续加固，建议把 `.codex\plugins`、`.codex\.tmp\bundled-marketplaces`、`.codex\.sandbox-bin` 明确加入维护脚本的保护名单。

## 可复用顺序

以后再遇到类似问题，可以按这个顺序处理：

```text
1. 确认 Codex Desktop 设置页里的 Browser / Computer Use 状态
2. 检查 openai-bundled marketplace 是否还在
3. 重装 browser、chrome、computer-use 三个 bundled 插件
4. 确认 browser-client.mjs / computer-use-client.mjs 存在
5. 检查 Chrome latest junction 和 native-host 配置
6. 修复 .sandbox-bin 里的 codex-command-runner
7. 运行 codex doctor 和 sandbox smoke test
8. 禁止 Windows 自动睡眠 / 休眠
9. 重启 Codex Desktop，让 native pipe 重新注入
10. 回头审计维护脚本是否误删 Codex 目录
```

这次最重要的经验是：不要只盯着设置页的“不可用”三个字。Codex Desktop 的 Browser、Computer Use 和智能沙盒是三条相互关联但不完全相同的链路。把文件、链接、helper、桌面端进程四层都修好，UI 才会真正恢复。
