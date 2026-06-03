---
title: "Recovering Codex Desktop Browser, Computer Use, and Sandbox After Sleep"
description: "A repair note for Codex Desktop when Browser, Computer Use, and the Windows sandbox became unavailable after system sleep."
date: "2026-06-03"
updated: "2026-06-03"
translationKey: "codex-desktop-browser-computer-use-sandbox-recovery"
tags: ["Codex", "Windows", "Browser", "Computer Use", "Sandbox"]
category: "Development Efficiency"
draft: false
cover: "https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg"
---

After the Windows machine resumed from sleep, Codex Desktop showed the in-app Browser plugin as unavailable, and Computer Use could not reconnect either. Restarting the app once did not help, because several lower-level pieces were broken at the same time.

![Codex Desktop recovery flow](https://files.js.gripe/files/fil_2uwVihY4MBZhcX3FCwg92Pmn.svg)

The working recovery sequence was to restore the `openai-bundled` marketplace, reinstall the Browser, Chrome, and Computer Use plugins, recreate the Chrome `latest` junction, refresh the Windows sandbox command runner, then restart Codex Desktop so native pipe paths were injected again.

## What Failed

The visible symptom was simple: the settings page said the Browser plugin was unavailable. The actual failure chain was larger:

```text
bundled marketplace / plugin cache incomplete
Chrome native-host latest path broken
sandbox command-runner stuck behind stale process state
Desktop native pipes not refreshed until app restart
```

After restoring `openai-bundled`, the important files to verify were:

```text
%USERPROFILE%\.codex\plugins\cache\openai-bundled\browser\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\chrome\...\scripts\browser-client.mjs
%USERPROFILE%\.codex\plugins\cache\openai-bundled\computer-use\...\scripts\computer-use-client.mjs
```

Chrome also needed its `latest` junction recreated so `chrome-native-hosts-v2.json` pointed to real files.

## Sandbox Repair

The sandbox layer had shown:

```text
CreateProcessWithLogonW failed: 5
```

The fix was to stop stale `codex-command-runner` helper processes and restore the runner into `.codex\.sandbox-bin`. After that, the sandbox smoke test worked again, and `codex doctor --summary` returned a healthy result.

![Recovery checklist](https://files.js.gripe/files/fil_BkYkqKeAVDyUo-7ADqoUrHMt.svg)

## Why The Final Restart Mattered

Once the files were repaired, Browser API checks were successful, but Computer Use still reported that the native pipe path was unavailable. The final Codex Desktop restart mattered because the running UI process did not automatically rebuild those native pipe paths.

That also explains why an earlier manual restart did not help: the plugin files, Chrome `latest` link, and sandbox helper had not been repaired yet.

## Maintenance Script Audit

I also checked local maintenance scripts for accidental or malicious cleanup. There was no evidence that they deleted `.codex\plugins`, `browser-client.mjs`, or `computer-use-client.mjs`.

`CodexBrightnessGuard` only handled brightness guarding. `OptimizeDevice.ps1` cleaned old files under TEMP and Windows Temp. `RunIntegrityCheck.ps1` only cleaned its own stdout and stderr files.

So this looked more like a damaged bundled marketplace or plugin cache state than a maintenance script deleting required Codex files. It is still worth protecting `.codex\plugins`, `.codex\.tmp\bundled-marketplaces`, and `.codex\.sandbox-bin` from future cleanup jobs.

## Reusable Order

```text
1. Check Browser and Computer Use settings state
2. Restore the openai-bundled marketplace
3. Reinstall browser, chrome, and computer-use
4. Verify client scripts exist
5. Repair the Chrome latest junction
6. Restore the sandbox command-runner
7. Run codex doctor and a sandbox smoke test
8. Disable automatic Windows sleep and hibernation
9. Restart Codex Desktop
10. Audit local maintenance scripts
```

The main lesson: Browser, Computer Use, and the sandbox are related, but they are not the same switch. The UI only recovered after the plugin files, native-host paths, sandbox helper, and Desktop native pipes were all healthy again.
