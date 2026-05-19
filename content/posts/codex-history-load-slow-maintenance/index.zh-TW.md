---
title: "Codex 載入歷史對話很慢：清理日誌庫並保留會話歷史"
description: "一次 Codex 歷史對話開啟過久的排查記錄：定位膨脹的 logs_2.sqlite，備份、清理低價值日誌、壓縮資料庫，並提供可重用維護腳本。"
date: "2026-05-19"
updated: "2026-05-19"
translationKey: "codex-history-load-slow-maintenance"
tags: ["Codex", "SQLite", "維運"]
category: "開發效率"
draft: false
cover: ""
---

最近在遠端主機上開啟 Codex 歷史對話時，載入時間明顯變長。問題本身不複雜，但很值得記錄：Codex 的會話歷史不只存在一個地方，真正拖慢介面的也未必是對話 JSONL 文件，而可能是本機日誌庫。

這篇文章基於一次實際處理過程，目標是盡量安全地恢復速度：先確認資料位置，再備份，再清理低價值日誌，最後壓縮 SQLite 文件。

## 現象

表現是 Codex 開啟歷史對話時等待很久，當前工作區本身沒有明顯的大型原始碼變更，也不是建置命令卡住。

先看 Codex 本機狀態目錄：

```bash
ls -lh ~/.codex
```

這次看到最可疑的是：

```text
logs_2.sqlite       約 573M
state_5.sqlite      約 3.4M
session_index.jsonl 約 3.5K
sessions/           約幾十個會話文件
```

`state_5.sqlite` 只有幾十條 thread 記錄，`session_index.jsonl` 也很小；真正異常的是 `logs_2.sqlite`。

## 先確認不是會話歷史本身

可以先看會話文件數量和最大文件：

```bash
find ~/.codex/sessions -type f | wc -l
find ~/.codex/sessions -type f -printf '%s %p\n' | sort -nr | head
```

如果只是少量 10MB 到 30MB 的長對話文件，通常還不至於讓歷史列表整體卡住。再檢查 thread 元資料：

```bash
sqlite3 ~/.codex/state_5.sqlite 'select count(*) from threads;'
sqlite3 ~/.codex/state_5.sqlite 'pragma quick_check;'
```

這次 thread 數量很小，健康檢查也正常。

## 定位 logs_2.sqlite

查看日誌庫結構：

```bash
sqlite3 ~/.codex/logs_2.sqlite '.schema logs'
```

重點欄位包括：

```text
level
target
thread_id
estimated_bytes
ts
```

再按級別和 target 聚合：

```bash
sqlite3 ~/.codex/logs_2.sqlite \
  "select level, count(*), sum(estimated_bytes) from logs group by level order by sum(estimated_bytes) desc;"

sqlite3 ~/.codex/logs_2.sqlite \
  "select target, count(*), sum(estimated_bytes) from logs group by target order by sum(estimated_bytes) desc limit 20;"
```

這次 `TRACE` 和 `DEBUG` 佔了大量空間，`codex_api::endpoint::responses_websocket` 這類 target 也非常大。對歷史對話可讀性來說，這些日誌價值不高；但如果介面或後台需要按 thread 查詢日誌，資料庫太大就會直接拖慢體驗。

## 安全處理步驟

不要直接刪除整個 `~/.codex`。那裡面還有認證、模型快取、會話文件、外掛和技能設定。

更穩的順序是：

1. 對 `logs_2.sqlite` 做 SQLite 線上備份；
2. 刪除低價值日誌，例如 `TRACE`、`DEBUG`，以及 24 小時以前的普通 `INFO`；
3. 保留 `WARN`、`ERROR`；
4. 執行 WAL checkpoint 和 `VACUUM`；
5. 再跑 `quick_check`。

手工命令範例：

```bash
sqlite3 ~/.codex/logs_2.sqlite ".backup '$HOME/.codex/logs_2.sqlite.bak-$(date +%Y%m%d-%H%M%S)'"

sqlite3 ~/.codex/logs_2.sqlite "
  PRAGMA busy_timeout=10000;
  DELETE FROM logs
  WHERE level IN ('TRACE','DEBUG')
     OR (
       ts < (SELECT max(ts) - 86400 FROM logs)
       AND level NOT IN ('WARN','ERROR')
     );
  PRAGMA wal_checkpoint(TRUNCATE);
  VACUUM;
  PRAGMA wal_checkpoint(TRUNCATE);
"

sqlite3 ~/.codex/logs_2.sqlite 'pragma quick_check;'
```

這次處理後，主日誌庫從約 `573M` 降到約 `36M`，歷史會話文件和 thread 元資料都沒有刪除。

## 可複製腳本

下面這份腳本是給遇到類似問題的人使用的，可以保存為 `maintain-codex-history.sh`。預設只是 dry run，不會修改資料庫；確認輸出後再加 `--apply`。

```bash
#!/usr/bin/env bash
set -euo pipefail

CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
KEEP_HOURS=24
APPLY=0
BACKUP=1
VACUUM_DB=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --codex-home) CODEX_HOME="$2"; shift 2 ;;
    --keep-hours) KEEP_HOURS="$2"; shift 2 ;;
    --apply) APPLY=1; shift ;;
    --no-backup) BACKUP=0; shift ;;
    --no-vacuum) VACUUM_DB=0; shift ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

DB="$CODEX_HOME/logs_2.sqlite"
[ -f "$DB" ] || { echo "Codex log database not found: $DB" >&2; exit 1; }
command -v sqlite3 >/dev/null || { echo "sqlite3 is required" >&2; exit 1; }

echo "Database: $DB"
ls -lh "$DB" "$DB"-wal "$DB"-shm 2>/dev/null || true

CHECK="$(sqlite3 "$DB" 'PRAGMA quick_check;')"
echo "quick_check: $CHECK"
[ "$CHECK" = "ok" ] || { echo "Database is not healthy. Stop here." >&2; exit 1; }

echo
sqlite3 "$DB" "SELECT 'rows', count(*), 'estimated_bytes', coalesce(sum(estimated_bytes),0) FROM logs;"
sqlite3 "$DB" "SELECT level, count(*), coalesce(sum(estimated_bytes),0) FROM logs GROUP BY level ORDER BY level;"

CUTOFF_EXPR="(SELECT max(ts) - ($KEEP_HOURS * 3600) FROM logs)"
WHERE_EXPR="level IN ('TRACE','DEBUG') OR (ts < $CUTOFF_EXPR AND level NOT IN ('WARN','ERROR'))"

echo
echo "Rows that would be removed:"
sqlite3 "$DB" "SELECT count(*), coalesce(sum(estimated_bytes),0) FROM logs WHERE $WHERE_EXPR;"

if [ "$APPLY" -ne 1 ]; then
  echo
  echo "Dry run only. Re-run with --apply to clean the log database."
  exit 0
fi

if [ "$BACKUP" -eq 1 ]; then
  BACKUP_PATH="$DB.bak-$(date +%Y%m%d-%H%M%S)"
  echo "Creating backup: $BACKUP_PATH"
  sqlite3 "$DB" ".backup '$BACKUP_PATH'"
fi

sqlite3 "$DB" "
  PRAGMA busy_timeout=10000;
  DELETE FROM logs WHERE $WHERE_EXPR;
  SELECT 'deleted_rows', changes();
  PRAGMA wal_checkpoint(TRUNCATE);
"

if [ "$VACUUM_DB" -eq 1 ]; then
  sqlite3 "$DB" "VACUUM; PRAGMA wal_checkpoint(TRUNCATE);"
fi

echo
echo "Final database files:"
ls -lh "$DB" "$DB"-wal "$DB"-shm 2>/dev/null || true
sqlite3 "$DB" 'PRAGMA quick_check;'
```

使用方式：

```bash
chmod +x maintain-codex-history.sh
./maintain-codex-history.sh
./maintain-codex-history.sh --apply
./maintain-codex-history.sh --keep-hours 48 --apply
```

腳本預設策略是：檢查 `logs_2.sqlite`，確認 `quick_check` 為 `ok`，統計可清理日誌；只有加 `--apply` 才會先備份再刪除低價值日誌，並執行 checkpoint 和 `VACUUM`。

## 什麼時候不該清理

如果你正在排查 Codex 本身的異常，或者需要把完整日誌交給上游分析，就先不要清理。可以只執行 dry run，確認膨脹來源後，把 `logs_2.sqlite` 備份出來再處理。

如果 `quick_check` 不是 `ok`，也不要繼續刪除。先複製整個資料庫和 WAL 文件，再單獨做 SQLite 修復或恢復。

## 結論

Codex 歷史對話載入慢，不一定是歷史對話太多。更常見的低風險處理對象，是膨脹的本機日誌庫。

保守做法是：保留 `sessions`、`state_5.sqlite` 和 `session_index.jsonl`，只對 `logs_2.sqlite` 做備份後的日誌瘦身。這樣既能改善載入速度，也不破壞真正的對話歷史。
