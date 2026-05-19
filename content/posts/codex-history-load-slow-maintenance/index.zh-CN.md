---
title: "Codex 加载历史对话很慢：清理日志库并保留会话历史"
description: "一次 Codex 历史对话打开过久的排查记录：定位膨胀的 logs_2.sqlite，备份、清理低价值日志、压缩数据库，并提供可复用维护脚本。"
date: "2026-05-19"
updated: "2026-05-19"
translationKey: "codex-history-load-slow-maintenance"
tags: ["Codex", "SQLite", "运维"]
category: "开发效率"
draft: false
cover: ""
---

最近在远程主机上打开 Codex 历史对话时，加载时间明显变长。问题本身不复杂，但很适合记录下来：Codex 的会话历史不只存在一个地方，真正拖慢界面的也未必是对话 JSONL 文件，而可能是本地日志库。

这篇文章基于一次实际处理过程，目标是尽量安全地恢复速度：先确认数据位置，再备份，再清理低价值日志，最后压缩 SQLite 文件。

## 现象

表现是 Codex 打开历史对话时等待很久，当前工作区本身没有明显的大型源码变更，也不是构建命令卡住。

先看 Codex 本地状态目录：

```bash
ls -lh ~/.codex
```

这次看到最可疑的是：

```text
logs_2.sqlite       约 573M
state_5.sqlite      约 3.4M
session_index.jsonl 约 3.5K
sessions/           约几十个会话文件
```

`state_5.sqlite` 只有几十条 thread 记录，`session_index.jsonl` 也很小；真正异常的是 `logs_2.sqlite`。

## 先确认不是会话历史本身

可以先看会话文件数量和最大文件：

```bash
find ~/.codex/sessions -type f | wc -l
find ~/.codex/sessions -type f -printf '%s %p\n' | sort -nr | head
```

如果只是少量 10MB 到 30MB 的长对话文件，通常还不至于让历史列表整体卡住。再检查 thread 元数据：

```bash
sqlite3 ~/.codex/state_5.sqlite 'select count(*) from threads;'
sqlite3 ~/.codex/state_5.sqlite 'pragma quick_check;'
```

这次 thread 数量很小，健康检查也正常。

## 定位 logs_2.sqlite

查看日志库结构：

```bash
sqlite3 ~/.codex/logs_2.sqlite '.schema logs'
```

重点字段包括：

```text
level
target
thread_id
estimated_bytes
ts
```

再按级别和 target 聚合：

```bash
sqlite3 ~/.codex/logs_2.sqlite \
  "select level, count(*), sum(estimated_bytes) from logs group by level order by sum(estimated_bytes) desc;"

sqlite3 ~/.codex/logs_2.sqlite \
  "select target, count(*), sum(estimated_bytes) from logs group by target order by sum(estimated_bytes) desc limit 20;"
```

这次 `TRACE` 和 `DEBUG` 占了大量空间，`codex_api::endpoint::responses_websocket` 这类 target 也非常大。对历史对话可读性来说，这些日志价值不高；但如果界面或后台需要按 thread 查询日志，库太大会直接拖慢体验。

## 安全处理步骤

不要直接删除整个 `~/.codex`。那里面还有认证、模型缓存、会话文件、插件和技能配置。

更稳的顺序是：

1. 对 `logs_2.sqlite` 做 SQLite 在线备份；
2. 删除低价值日志，例如 `TRACE`、`DEBUG`，以及 24 小时以前的普通 `INFO`；
3. 保留 `WARN`、`ERROR`；
4. 执行 WAL checkpoint 和 `VACUUM`；
5. 再跑 `quick_check`。

手工命令示例：

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

这次处理后，主日志库从约 `573M` 降到约 `36M`，历史会话文件和 thread 元数据都没有删除。

## 可复制脚本

下面这份脚本是给遇到类似问题的人使用的，可以保存为 `maintain-codex-history.sh`。默认只是 dry run，不会修改数据库；确认输出后再加 `--apply`。

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

脚本默认策略是：检查 `logs_2.sqlite`，确认 `quick_check` 为 `ok`，统计可清理日志；只有加 `--apply` 才会先备份再删除低价值日志，并执行 checkpoint 和 `VACUUM`。

## 什么时候不该清理

如果你正在排查 Codex 本身的异常，或者需要把完整日志交给上游分析，就先不要清理。可以只运行 dry run，确认膨胀来源后，把 `logs_2.sqlite` 备份出来再处理。

如果 `quick_check` 不是 `ok`，也不要继续删除。先复制整个数据库和 WAL 文件，再单独做 SQLite 修复或恢复。

## 结论

Codex 历史对话加载慢，不一定是历史对话太多。更常见的低风险处理对象，是膨胀的本地日志库。

保守做法是：保留 `sessions`、`state_5.sqlite` 和 `session_index.jsonl`，只对 `logs_2.sqlite` 做备份后的日志瘦身。这样既能改善加载速度，也不破坏真正的对话历史。
