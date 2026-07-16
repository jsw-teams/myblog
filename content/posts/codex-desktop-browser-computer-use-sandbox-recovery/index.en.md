---
title: "When Windows Codex Desktop Wakes Up Without Browser or Computer Use: Let Codex Take Over the Repair"
description: "A recovery note for Codex Desktop after sleep breaks Browser, Computer Use, or the sandbox helper."
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "Development Efficiency"
draft: false
---

After Windows woke from sleep, Codex Desktop was still open, but Browser and Computer Use were gone. Settings still loaded, Browser showed that the in-app browser plugin was unavailable, and Computer Use could not connect. Closing and reopening Codex Desktop once did not fix it.

This note is for two readers: the user who just hit the failure, and the Codex instance taking over the repair. The point is not to teach the user to manually pick through `.codex`; it is to hand the scene to Codex so it can inspect state, decide what broke, repair files, restart the right pieces, and leave a reusable recovery record.

The original failure screenshots stay here because they are the clearest evidence:

## Repair Script Download

If you want to try the routine repair path first, download this Windows batch script:


On Windows, right-click it and choose "Run as administrator." Friendly warning: the script closes Google Chrome, so save browser work, forms, and unsent pages before running it. The script does not reinstall Codex; it focuses on restoring bundled plugin resources, repairing Browser / Computer Use configuration and helpers, and then asking you to restart Codex Desktop and reopen Settings to trigger plugin enumeration.

## Hand The Scene To Codex

This prompt gives Codex the right job: take over the repair, not merely write advice.

```text
My Windows Codex Desktop broke after the computer slept and woke. Settings shows Browser or Computer Use unavailable. Browser may say the in-app browser plugin is unavailable. Computer Use may say the native pipe path is unavailable. A normal shell may still work.

Please take over the repair directly. First determine which layer is broken, then handle routine checks and routine fixes yourself: restore missing files, repair links, reinstall missing plugins, stop clearly stale helpers, and run verification commands. Ask me first only for high-risk actions such as deleting whole directories, reinstalling Codex, clearing .codex, or killing many processes.

When done, tell me what broke, what you changed, how you verified it, and how to re-check quickly if it breaks again.
```

## Step One: Check openai-bundled And Plugin Caches

Browser, Chrome, and Computer Use are not isolated buttons. They depend on Codex's local bundled marketplace. In this incident, `openai-bundled` resources were incomplete: the UI could still show some plugin metadata, but the actual scripts needed by Browser and Computer Use were missing or pointed nowhere.

Codex should first verify these paths:

```text
%USERPROFILE%\.codex\.tmp\bundled-marketplaces\openai-bundled
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

Optional, but worth putting in the first step: also check whether any local maintenance script cleaned `.codex\plugins`, `.codex\.tmp\bundled-marketplaces`, or `.codex\.sandbox-bin`.

## Step Two: Repair The Chrome latest Junction

The Chrome plugin also depends on native host configuration. A version directory can exist while the `latest` junction is broken; the native host config can exist while its target script is missing.

The junction should point to the real version directory, for example:

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\latest -> 26.601.21317
```

After that, Codex should verify that `chrome-native-hosts-v2.json` resolves to real files.

## Step Three: Repair The Sandbox Helper

After Browser files were restored, the Windows sandbox path could still fail with:

```text
CreateProcessWithLogonW failed: 5
```

That means the normal sandbox shell launch path was affected too. Codex should check `.sandbox-bin`, verify `codex-command-runner`, identify clearly stale helper processes, restore the runner from Codex AppData if needed, then run `codex doctor --summary` and a sandbox smoke test.

## Step Four: Restart Codex Desktop

After the files are repaired, Browser APIs may work before Computer Use does. Computer Use can still report that the native pipe path is unavailable until Codex Desktop restarts.

Browser and Computer Use both need the desktop process to inject native pipe paths into the current session. Once the files, links, helpers, and desktop process are all back in shape, the UI recovers for real.

The practical lesson from this incident: do not stop at the settings page saying "unavailable." Codex Desktop Browser, Computer Use, and the sandbox helper are related but separate chains. Repair all four layers: files, links, helpers, and the desktop process.
