---
title: "Codex History Loading Slowly? Open a Fresh Chat and Let Codex Diagnose It"
description: "When Codex history feels slow, do not start with database surgery. Open a new Codex chat, ask it to inspect safely, and let it suggest the fix."
date: "2026-05-19"
updated: "2026-06-02"
translationKey: "codex-history-load-slow-maintenance"
tags: ["Codex", "Development Efficiency", "Debugging"]
category: "Development Efficiency"
draft: false
cover: ""
---

Sometimes Codex history opens as if it is carrying a very old suitcase upstairs. You click a past conversation, wait, click again, wait again, and eventually start blaming the network, the remote host, the workspace, and maybe your own habit of keeping one conversation alive forever.

Before doing database surgery, try the simple path: **open a fresh Codex chat, ask Codex to diagnose why the old history is slow, and let it clean the history for you.**

It sounds a little circular: Codex is slow, so we ask Codex to fix Codex. But it works because the slow part is often an old thread, a swollen log database, a huge workspace, or a tight remote VPS. A new chat is usually clean enough to act as the calm outside observer.

## Start From a Clean Desk

If one history thread is painfully slow, stop waiting inside that old thread. Open a new Codex chat and say:

```text
Codex history is loading slowly on this machine.
Please diagnose likely causes. First inspect ~/.codex, workspace size,
log files, session count, and database sizes in read-only mode.
Do not delete anything. Tell me the risks and recommendations first.
```

The key is to ask for judgment first, not deletion. The fresh chat is not dragging the old context behind it, so it is a better place to troubleshoot.

## What Codex Should Check

Ask Codex to inspect these items in order:

```text
1. unusually large files under ~/.codex;
2. session count and largest files under sessions;
3. whether logs_2.sqlite is oversized;
4. whether state_5.sqlite and session_index.jsonl look normal;
5. whether the workspace contains huge node_modules, dist, logs, or caches;
6. whether the remote host is running out of disk.
```

This matters even more on small VPS machines used through VS Code Remote + Codex. When the disk is only a few GB, logs, build output, dependencies, and editor state can make the whole machine feel sticky.

## A Better Prompt

This prompt is usually enough:

```text
Please help me troubleshoot slow Codex history loading.

Requirements:
- inspect read-only first;
- explain which files may affect history loading;
- separate safe-to-clean items from do-not-touch items;
- if cleanup is needed, give me a backup plan first;
- if it is safe, help me clean Codex history;
- tell me how to return to the VS Code Codex home screen and confirm the result.
```

Codex will usually list inspection commands first, then use the output to decide whether the problem is logs, sessions, workspace cache, or disk pressure.

## Let It Clean the History

If your main goal is to make the history home screen feel clean again, continue with:

```text
Please help me clean Codex history.
Requirements:
- tell me which files or records will be cleaned first;
- make any necessary backup before cleanup;
- do not affect current authentication or plugin configuration;
- after cleanup, tell me how to confirm it on the VS Code Codex home screen.
```

After cleanup, go back to VS Code and open or refresh the Codex home screen. The history list should be cleared or noticeably shorter. That feedback is pleasantly direct: you do not have to guess from database sizes, because the home screen tells you what changed.

## Common Answers

The first common answer is that the old thread is simply too long. That does not need a heroic fix. Keep the old thread as reference and continue the work in a new chat.

The second is that `~/.codex/logs_2.sqlite` is very large. That is a log database, not the real conversation history. The safer route is to back it up, remove low-value logs, and compact the database.

The third is a heavy workspace. `node_modules`, `dist`, build caches, downloads, and generated files can slow both Codex and VS Code Remote.

The fourth is a nearly full remote disk. Once a small VPS runs out of breathing room, shells, editors, logs, and databases all start feeling worse.

## If Cleanup Is Needed, Wear a Seatbelt

If Codex says the log database is oversized, ask for a conservative cleanup plan:

```text
Please give me a conservative cleanup plan:
1. back up ~/.codex/logs_2.sqlite first;
2. clean only TRACE, DEBUG, and old INFO logs;
3. keep WARN and ERROR;
4. run quick_check;
5. show file sizes before and after;
6. do not delete sessions, state_5.sqlite, or session_index.jsonl.
```

That last line matters. `sessions`, `state_5.sqlite`, and `session_index.jsonl` are the parts you should treat carefully.

## When to Touch Nothing

If you are debugging Codex itself, or you plan to send complete logs upstream, do not clean yet. Let Codex summarize the situation, list file sizes, and prepare the evidence.

If a database health check fails, do not start deleting rows. Back it up first, then ask Codex whether recovery, copying, or rebuilding an index is the better move. Slow is annoying; accidental deletion is worse.

## Takeaway

When Codex history loads slowly, do not immediately dive into `~/.codex` with a wrench. The easier path is:

```text
open a fresh Codex chat -> ask for read-only inspection -> let it diagnose -> clean history -> confirm on the VS Code Codex home screen
```

It is like moving to a clean desk before sorting a messy one. You get a clearer view, fewer risky guesses, and a much better chance of keeping the real conversation history intact.
