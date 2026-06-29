---
title: "OpenWrt QModem 下 RM502Q-AE 無法接收簡訊的排障與恢復：IMS、5G SA 與簡訊承載設定"
description: "一次真實排障記錄：QModem 頁面收不到簡訊，最後定位為中國移動 NR5G SA 下 IMS 未開啟；開啟 IMS 並重啟 RM502Q-AE 後，簡訊恢復接收。"
date: "2026-04-29"
updated: "2026-04-29"
translationKey: "rm502q-ae-openwrt-qmodem-sms-ims-fix"
tags: ["OpenWrt", "QModem", "IMS", "SMS"]
category: "技術實作"
draft: false
cover: ""
---

這是一篇真實排障記錄：OpenWrt 上透過 QModem 管理 Quectel RM502Q-AE 時，QModem 簡訊頁面一直收不到簡訊。最後確認問題不在頁面讀取，也不是簡訊儲存已滿，而是在中國移動 NR5G SA 場景下 IMS 處於關閉狀態。開啟 IMS 並重啟模組後，簡訊恢復接收。

<!--more-->

文中涉及身份類資訊均已脫敏；如果需要提到 CIMI/IMSI，只記錄為 `46007************` 或「已脫敏」。簡訊正文不記錄。

## 1. 背景與症狀

環境很普通：OpenWrt 系統，QModem 管理 RM502Q-AE，AT 連接埠使用 `/dev/mhi_DUN`。模組資訊如下：

```text
ATI
Quectel
RM502Q-AE
Revision: RM502QAEAAR13A04M4G

AT+QGMR
RM502QAEAAR13A04M4G_01.203.01.203
```

營運商為中國移動，網路曾駐留在 NR5G SA：

```text
AT+QNWINFO
+QNWINFO: "TDD NR5G","46000","NR5G BAND 79",721824
```

排障過程中也出現過 `NR5G BAND 41`。5G SA 註冊狀態最後正常：

```text
AT+C5GREG?
+C5GREG: 2,1,...,11,...

AT+C5GREG?
+C5GREG: 0,1
```

原始症狀是 QModem 的簡訊頁面沒有任何簡訊。介面返回中 `msg` 為空，儲存能力看起來正常：

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

## 2. 先確認不是 QModem 頁面問題

第一步不是改設定，而是確認簡訊到底有沒有進入模組儲存。分別檢查 `ME`、`MT`、`SM`、`SR` 後，結果都為空：

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

`AT+CMGL=4` 返回 `OK` 但沒有任何 `+CMGL` 行。這一點很關鍵：如果 `ME`、`MT`、`SM`、`SR` 都為空，就不是 QModem 頁面只讀錯了 ME/SM，也不是儲存已滿，而是簡訊沒有進入模組可讀儲存。

## 3. PDU 模式下 CMGL 的一個容易踩坑點

排障初期曾看到：

```text
AT+CMGL="ALL"
ERROR
```

這很容易被誤判成簡訊功能異常。後續確認目前是 PDU 模式：

```text
AT+CMGF?
+CMGF: 0

AT+CMGL=?
+CMGL: (0-4)
```

在 PDU 模式下，列出全部簡訊應使用：

```text
AT+CMGL=4
```

而不是：

```text
AT+CMGL="ALL"
```

`AT+CMGL="ALL"` 更適合文字模式，也就是先執行 `AT+CMGF=1` 的場景。驗證碼、中文簡訊和 Unicode 內容更適合保留 PDU 模式，所以這裡最後使用 `AT+CMGF=0` 與 `AT+CMGL=4`。

## 4. 簡訊儲存、URC 和通知設定

排障中驗證或設定過這一組基礎簡訊設定：

```text
AT+CMEE=2
AT+QURCCFG="urcport","all"
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

這些命令的作用可以這樣理解：

- `AT+QURCCFG="urcport","all"`：讓 URC 從所有可用 AT 連接埠輸出，避免 QModem 使用的連接埠和手動調試的 AT 口不一致，導致新簡訊通知看不到。
- `AT+CPMS="MT","MT","MT"`：使用模組簡訊總視圖，避免簡訊落在 `ME` 或 `SM`，但讀取時看了另一邊。
- `AT+CNMI=2,1,0,0,0`：新簡訊儲存後，透過 `+CMTI` 通知終端。
- `AT+CMGF=0`：保持 PDU 模式，更適合驗證碼、中文簡訊和 Unicode 內容。

如果選擇文字模式，才更適合使用：

```text
AT+CMGF=1
AT+CMGL="ALL"
```

## 5. 5G SA 註冊正常但簡訊仍未進入儲存

當時 5G SA 註冊已經正常，但簡訊仍然沒有進入任何儲存。繼續檢查簡訊承載偏好：

```text
AT+CGSMS?
+CGSMS: 1
```

`CGSMS=1` 可以理解為偏向傳統 CS 域。對於目前中國移動 NR5G SA 場景，這並不是理想狀態。隨後設定為：

```text
AT+CGSMS=2
OK
```

`CGSMS=2` 可理解為 Packet domain preferred / PS preferred。這裡不要寫得過度絕對：不同營運商、不同韌體、不同註冊狀態下，簡訊承載策略可能不同。但在這次 NR5G SA 排障中，不應繼續讓簡訊承載偏向傳統 CS 域。

## 6. 關鍵發現：IMS 是關閉的

真正的關鍵點來自 IMS 設定：

```text
AT+QCFG="ims"
+QCFG: "ims",0,0
```

這表示 IMS 未開啟。隨後執行：

```text
AT+QCFG="ims",1
OK
```

重啟模組後，簡訊恢復正常，可以接收簡訊。也就是說，在這次 RM502Q-AE 駐留中國移動 NR5G SA 網路的場景裡，簡訊恢復的關鍵動作不是清空儲存，也不是換 QModem 頁面讀取方式，而是開啟 IMS。

## 7. 修復步驟

核心修復命令如下：

```text
AT+CMEE=2
AT+QCFG="ims",1
AT+CFUN=1,1
```

模組重啟後，建議重新設定簡訊相關參數：

```text
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

本次實際結果是：開啟 IMS 並重啟後，QModem 可以收到簡訊。

## 8. 回滾步驟

如果開啟 IMS 後出現註冊、撥號或網路異常，可以回滾：

```text
AT+QCFG="ims",0
AT+CFUN=1,1
```

但本次故障的實際恢復動作是開啟 IMS，因此最後建議保留：

```text
AT+QCFG="ims",1
```

如果需要回滾簡訊承載偏好，可以執行：

```text
AT+CGSMS=1
```

不過這不推薦作為本次 NR5G SA 場景下的最終狀態，因為簡訊恢復後使用的是：

```text
AT+CGSMS: 2
```

## 9. QModem 初始化後 AT 命令建議

建議寫入 QModem 的「初始化後 AT 命令」：

```text
AT+QCFG="ims",1
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

這裡不依賴 `AT&W`。實際排障中，`AT&W` 沒有穩定返回 `OK`，而 OpenWrt/QModem 的使用方式也更適合把關鍵初始化命令交給 QModem 在啟動後執行。這樣即使 profile 持久化行為不確定，重啟後仍能把簡訊相關狀態拉回預期設定。

## 10. 後續：如何判斷載波聚合是否觸發

簡訊恢復後，又繼續看了載波聚合狀態：

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

`QCAINFO` 只有 `PCC`，沒有 `SCC`，說明查詢當下沒有觸發載波聚合。但 `QENG="servingcell"` 顯示 `NOCONN`，代表當時處於空閒或未連線態，不能據此判斷模組或網路不支援 CA。

正確判斷方法是在測速或大流量下載過程中，反覆執行：

```text
AT+QCAINFO
AT+QENG="servingcell"
```

如果出現 `SCC`，才說明 CA 被網路側調度。`AT+QCFG="lteca"` 返回 `ERROR`，只說明目前韌體不支援這個設定項，或沒有開放這個 `QCFG` 項，不等於 CA 被關閉。

對於 NR5G SA 下的 NR CA，更多取決於網路側調度、基地台設定、套餐、信號、頻段組合和是否鎖頻。不要為了測試 CA 盲目寫未知 AT 命令，更不要把已經驗證有效的 IMS 關閉。

## 11. 結論

這次故障的結論很明確：

- 不是簡訊儲存已滿。
- 不是 QModem 只讀錯 `ME` 或 `SM`。
- `ME`、`MT`、`SM`、`SR` 都為空，說明簡訊沒有進入模組可讀儲存。
- 目前網路是中國移動 NR5G SA，5G 註冊狀態正常。
- 簡訊恢復的關鍵動作是開啟 IMS：`AT+QCFG="ims",1`，然後透過 `AT+CFUN=1,1` 重啟模組。
- 重啟後可以接收簡訊。
- 後續建議保留 IMS 開啟，並在 QModem 初始化後 AT 命令中固化簡訊相關設定。
- 關於 CA：查詢時 `QCAINFO` 只有 `PCC`，說明當時沒有觸發 CA；`AT+QCFG="lteca"` 返回 `ERROR` 不代表 CA 不能用，只代表該設定項不可用。正確方式是在大流量期間觀察 `QCAINFO` 是否出現 `SCC`。
