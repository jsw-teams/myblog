---
title: "When Codex History Loads Slowly: Trim the Log Database Without Losing Conversations"
description: "A practical Codex maintenance note: find an oversized logs_2.sqlite, back it up, remove low-value logs, vacuum the database, and reuse the included script."
date: "2026-05-19"
updated: "2026-05-19"
translationKey: "codex-history-load-slow-maintenance"
tags: ["Codex", "SQLite", "Operations"]
category: "Development Efficiency"
draft: false
cover: ""
---

I recently hit a slow Codex history view on a remote development host. The fix was straightforward, but the path is worth writing down: Codex history lives in more than one place, and the slow part is not always the conversation JSONL files. In this case, the local log database was the heavy piece.

This note keeps the maintenance path conservative: inspect first, back up, remove low-value logs, then compact the SQLite database.

## Symptom

Opening Codex history took a long time. The current workspace did not have a suspiciously large code change, and no build command was running.

The first useful check was the Codex state directory:

```bash
ls -lh ~/.codex
```

The suspicious file was:

```text
logs_2.sqlite       about 573M
state_5.sqlite      about 3.4M
session_index.jsonl about 3.5K
sessions/           a few dozen session files
```

`state_5.sqlite` only had a few dozen thread records, and `session_index.jsonl` was tiny. The unusual file was `logs_2.sqlite`.

## Check the Conversation Files First

Start with the number and size of stored sessions:

```bash
find ~/.codex/sessions -type f | wc -l
find ~/.codex/sessions -type f -printf '%s %p\n' | sort -nr | head
```

A handful of 10MB to 30MB long conversations usually does not explain a slow history list by itself. Then check the thread metadata:

```bash
sqlite3 ~/.codex/state_5.sqlite 'select count(*) from threads;'
sqlite3 ~/.codex/state_5.sqlite 'pragma quick_check;'
```

In this case the thread count was small and the health check was clean.

## Inspect logs_2.sqlite

Look at the log schema:

```bash
sqlite3 ~/.codex/logs_2.sqlite '.schema logs'
```

The useful fields are:

```text
level
target
thread_id
estimated_bytes
ts
```

Then aggregate by level and target:

```bash
sqlite3 ~/.codex/logs_2.sqlite \
  "select level, count(*), sum(estimated_bytes) from logs group by level order by sum(estimated_bytes) desc;"

sqlite3 ~/.codex/logs_2.sqlite \
  "select target, count(*), sum(estimated_bytes) from logs group by target order by sum(estimated_bytes) desc limit 20;"
```

Here, `TRACE` and `DEBUG` took a large amount of space, and targets such as `codex_api::endpoint::responses_websocket` dominated the database. These logs are not very useful for reading old conversations, but a large log database can still slow down history-related queries.

## Safe Maintenance Steps

Do not delete the whole `~/.codex` directory. It also contains auth state, model cache, session files, plugins, and skills.

The safer order is:

1. create a SQLite backup of `logs_2.sqlite`;
2. delete low-value logs such as `TRACE`, `DEBUG`, and ordinary old `INFO`;
3. keep `WARN` and `ERROR`;
4. run WAL checkpoint and `VACUUM`;
5. run `quick_check` again.

Manual commands:

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

In this run, the main log database went from about `573M` to about `36M`, while the real session files and thread metadata stayed in place.

## Copyable Script

The script below is meant for readers who hit a similar problem. Save it as `maintain-codex-history.sh`. By default it is a dry run and does not modify the database; add `--apply` only after checking the output.

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

Usage:

```bash
chmod +x maintain-codex-history.sh
./maintain-codex-history.sh
./maintain-codex-history.sh --apply
./maintain-codex-history.sh --keep-hours 48 --apply
```

The default policy is to inspect `logs_2.sqlite`, require `quick_check = ok`, and report removable logs. Only `--apply` creates a backup, deletes low-value logs, checkpoints the WAL, and runs `VACUUM`.

## When Not to Clean

If you are actively debugging Codex itself, or you need complete logs for upstream analysis, do not clean immediately. Run the dry run first, confirm what is large, and keep a copy of `logs_2.sqlite`.

If `quick_check` does not return `ok`, stop. Copy the database and WAL files first, then handle SQLite repair or recovery separately.

## Takeaway

Slow Codex history loading does not always mean there are too many conversations. The lower-risk maintenance target is often the local log database.

The conservative approach is to keep `sessions`, `state_5.sqlite`, and `session_index.jsonl`, and only trim `logs_2.sqlite` after a backup. That improves loading speed without destroying the actual conversation history.
