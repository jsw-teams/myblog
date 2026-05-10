---
title: "OpenWrt QModem 下 RM502Q-AE 无法接收短信的排障与恢复：IMS、5G SA 与短信承载配置"
description: "一次真实排障记录：QModem 页面收不到短信，最终定位为中国移动 NR5G SA 下 IMS 未开启；开启 IMS 并重启 RM502Q-AE 后，短信恢复接收。"
date: "2026-04-29"
updated: "2026-04-29"
translationKey: "rm502q-ae-openwrt-qmodem-sms-ims-fix"
tags: ["OpenWrt", "QModem", "IMS", "SMS"]
category: "排障记录"
draft: false
cover: ""
---

这是一篇真实排障记录：OpenWrt 上通过 QModem 管理 Quectel RM502Q-AE 时，QModem 短信页面一直收不到短信。最后确认问题不在页面读取，也不是短信存储满，而是在中国移动 NR5G SA 场景下 IMS 处于关闭状态。开启 IMS 并重启模组后，短信恢复接收。

<!--more-->

文中涉及身份类信息均已脱敏；如果需要提到 CIMI/IMSI，只记录为 `46007************` 或“已脱敏”。短信正文不记录。

## 1. 背景与症状

环境很普通：OpenWrt 系统，QModem 管理 RM502Q-AE，AT 端口使用 `/dev/mhi_DUN`。模组信息如下：

```text
ATI
Quectel
RM502Q-AE
Revision: RM502QAEAAR13A04M4G

AT+QGMR
RM502QAEAAR13A04M4G_01.203.01.203
```

运营商为中国移动，网络曾驻留在 NR5G SA：

```text
AT+QNWINFO
+QNWINFO: "TDD NR5G","46000","NR5G BAND 79",721824
```

排障过程中也出现过 `NR5G BAND 41`。5G SA 注册状态最终正常：

```text
AT+C5GREG?
+C5GREG: 2,1,...,11,...

AT+C5GREG?
+C5GREG: 0,1
```

原始症状是 QModem 的短信页面没有任何短信。接口返回中 `msg` 为空，存储能力看起来正常：

```json
{
  "msg": [],
  "result": {},
  "sms_capabilities": {
    "mem1": "MT",
    "mem2": "MT",
    "mem3": "MT",
    "ME": { "used": "0", "total": "127" },
    "SM": {}
  }
}
```

## 2. 先确认不是 QModem 页面问题

第一步不是改配置，而是确认短信到底有没有进入模组存储。分别检查 `ME`、`MT`、`SM`、`SR` 后，结果都为空：

```text
AT+CPMS="ME","ME","ME"
+CPMS: 0,127,0,127,0,127
OK

AT+CPMS="MT","MT","MT"
+CPMS: 0,127,0,127,0,127
OK

AT+CPMS="SM","SM","SM"
+CPMS: 0,50,0,50,0,50
OK

AT+CPMS="SR","SR","SR"
+CPMS: 0,5,0,5,0,5
OK

AT+CMGL=4
OK
```

`AT+CMGL=4` 返回 `OK` 但没有任何 `+CMGL` 行。这一点很关键：如果 `ME`、`MT`、`SM`、`SR` 都为空，就不是 QModem 页面只读错了 ME/SM，也不是存储满，而是短信没有进入模组可读存储。

## 3. PDU 模式下 CMGL 的一个容易踩坑点

排障初期曾看到：

```text
AT+CMGL="ALL"
ERROR
```

这很容易被误判成短信功能异常。后续确认当前是 PDU 模式：

```text
AT+CMGF?
+CMGF: 0

AT+CMGL=?
+CMGL: (0-4)
```

在 PDU 模式下，列出全部短信应使用：

```text
AT+CMGL=4
```

而不是：

```text
AT+CMGL="ALL"
```

`AT+CMGL="ALL"` 更适合文本模式，也就是先执行 `AT+CMGF=1` 的场景。验证码、中文短信和 Unicode 内容更适合保留 PDU 模式，所以这里最终使用 `AT+CMGF=0` 与 `AT+CMGL=4`。

## 4. 短信存储、URC 和通知配置

排障中验证或设置过这一组基础短信配置：

```text
AT+CMEE=2
AT+QURCCFG="urcport","all"
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

这些命令的作用可以这样理解：

- `AT+QURCCFG="urcport","all"`：让 URC 从所有可用 AT 端口输出，避免 QModem 使用的端口和手工调试的 AT 口不一致，导致新短信通知看不到。
- `AT+CPMS="MT","MT","MT"`：使用模组短信总视图，避免短信落在 `ME` 或 `SM`，但读取时看了另一边。
- `AT+CNMI=2,1,0,0,0`：新短信存储后，通过 `+CMTI` 通知终端。
- `AT+CMGF=0`：保持 PDU 模式，更适合验证码、中文短信和 Unicode 内容。

如果选择文本模式，才更适合使用：

```text
AT+CMGF=1
AT+CMGL="ALL"
```

## 5. 5G SA 注册正常但短信仍未进入存储

当时 5G SA 注册已经正常，但短信仍然没有进入任何存储。继续检查短信承载偏好：

```text
AT+CGSMS?
+CGSMS: 1
```

`CGSMS=1` 可以理解为偏向传统 CS 域。对于当前中国移动 NR5G SA 场景，这并不是理想状态。随后设置为：

```text
AT+CGSMS=2
OK
```

`CGSMS=2` 可理解为 Packet domain preferred / PS preferred。这里不要写得过度绝对：不同运营商、不同固件、不同注册状态下，短信承载策略可能不同。但在这次 NR5G SA 排障中，不应继续让短信承载偏向传统 CS 域。

## 6. 关键发现：IMS 是关闭的

真正的关键点来自 IMS 配置：

```text
AT+QCFG="ims"
+QCFG: "ims",0,0
```

这表示 IMS 未开启。随后执行：

```text
AT+QCFG="ims",1
OK
```

重启模组后，短信恢复正常，可以接收短信。也就是说，在这次 RM502Q-AE 驻留中国移动 NR5G SA 网络的场景里，短信恢复的关键动作不是清空存储，也不是换 QModem 页面读取方式，而是开启 IMS。

## 7. 修复步骤

核心修复命令如下：

```text
AT+CMEE=2
AT+QCFG="ims",1
AT+CFUN=1,1
```

模组重启后，建议重新设置短信相关参数：

```text
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

本次实际结果是：开启 IMS 并重启后，QModem 可以收到短信。

## 8. 回滚步骤

如果开启 IMS 后出现注册、拨号或网络异常，可以回滚：

```text
AT+QCFG="ims",0
AT+CFUN=1,1
```

但本次故障的实际恢复动作是开启 IMS，因此最终建议保留：

```text
AT+QCFG="ims",1
```

如果需要回滚短信承载偏好，可以执行：

```text
AT+CGSMS=1
```

不过这不推荐作为本次 NR5G SA 场景下的最终状态，因为短信恢复后使用的是：

```text
AT+CGSMS: 2
```

## 9. QModem 初始化后 AT 命令建议

建议写入 QModem 的“初始化后 AT 命令”：

```text
AT+QCFG="ims",1
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

这里不依赖 `AT&W`。实际排障中，`AT&W` 没有稳定返回 `OK`，而 OpenWrt/QModem 的使用方式也更适合把关键初始化命令交给 QModem 在启动后执行。这样即使 profile 持久化行为不确定，重启后仍能把短信相关状态拉回预期配置。

## 10. 后续：如何判断载波聚合是否触发

短信恢复后，又继续看了载波聚合状态：

```text
AT+QCAINFO
+QCAINFO: "PCC",721824,6,"NR5G BAND 79",347

AT+QNWINFO
+QNWINFO: "TDD NR5G","46000","NR5G BAND 79",721824

AT+QENG="servingcell"
+QENG: "servingcell","NOCONN","NR5G-SA","TDD",460,00,...,721824,79,...

AT+QCFG="lteca"
ERROR
```

`QCAINFO` 只有 `PCC`，没有 `SCC`，说明查询当下没有触发载波聚合。但 `QENG="servingcell"` 显示 `NOCONN`，代表当时处于空闲或未连接态，不能据此判断模组或网络不支持 CA。

正确判断方法是在测速或大流量下载过程中，反复执行：

```text
AT+QCAINFO
AT+QENG="servingcell"
```

如果出现 `SCC`，才说明 CA 被网络侧调度。`AT+QCFG="lteca"` 返回 `ERROR`，只说明当前固件不支持这个配置项，或没有开放这个 `QCFG` 项，不等于 CA 被关闭。

对于 NR5G SA 下的 NR CA，更多取决于网络侧调度、基站配置、套餐、信号、频段组合和是否锁频。不要为了测试 CA 盲目写未知 AT 命令，更不要把已经验证有效的 IMS 关闭。

## 11. 结论

这次故障的结论很明确：

- 不是短信存储满。
- 不是 QModem 只读错 `ME` 或 `SM`。
- `ME`、`MT`、`SM`、`SR` 都为空，说明短信没有进入模组可读存储。
- 当前网络是中国移动 NR5G SA，5G 注册状态正常。
- 短信恢复的关键动作是开启 IMS：`AT+QCFG="ims",1`，然后通过 `AT+CFUN=1,1` 重启模组。
- 重启后可以接收短信。
- 后续建议保留 IMS 开启，并在 QModem 初始化后 AT 命令中固化短信相关配置。
- 关于 CA：查询时 `QCAINFO` 只有 `PCC`，说明当时没有触发 CA；`AT+QCFG="lteca"` 返回 `ERROR` 不代表 CA 不能用，只代表该配置项不可用。正确方式是在大流量期间观察 `QCAINFO` 是否出现 `SCC`。
