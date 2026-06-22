---
title: "Fixing SMS Reception on RM502Q-AE with OpenWrt QModem: IMS, 5G SA, and SMS Bearer Settings"
description: "A real troubleshooting note: QModem showed no incoming SMS, and the root cause was IMS being disabled while the RM502Q-AE was registered on China Mobile NR5G SA. Enabling IMS and rebooting restored SMS reception."
date: "2026-04-29"
updated: "2026-04-29"
translationKey: "rm502q-ae-openwrt-qmodem-sms-ims-fix"
tags: ["OpenWrt", "QModem", "IMS", "SMS"]
category: "Technical Practice"
draft: false
cover: ""
---

This is a real troubleshooting note from an OpenWrt setup using QModem to manage a Quectel RM502Q-AE. QModem could not show any incoming SMS. The final cause was not the web page, not a full SMS store, and not a wrong ME/SM selection. The modem was registered on China Mobile NR5G SA with IMS disabled. After enabling IMS and rebooting the modem, SMS reception recovered.

<!--more-->

Identity-related values are redacted in this note. If CIMI/IMSI needs to be mentioned, it is written only as `46007************` or as redacted. Real SMS content is not included.

## 1. Background and Symptoms

The setup was straightforward: OpenWrt, QModem, a Quectel RM502Q-AE, and the AT port at `/dev/mhi_DUN`. The modem reported:

```text
ATI
Quectel
RM502Q-AE
Revision: RM502QAEAAR13A04M4G

AT+QGMR
RM502QAEAAR13A04M4G_01.203.01.203
```

The operator was China Mobile, and the modem had been camped on NR5G SA:

```text
AT+QNWINFO
+QNWINFO: "TDD NR5G","46000","NR5G BAND 79",721824
```

`NR5G BAND 41` also appeared during troubleshooting. 5G SA registration eventually looked normal:

```text
AT+C5GREG?
+C5GREG: 2,1,...,11,...

AT+C5GREG?
+C5GREG: 0,1
```

The visible symptom was simple: the QModem SMS page did not show any message. The API response had an empty `msg` array, while the reported storage capability looked valid:

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

## 2. First, Verify It Is Not Just a QModem Page Issue

The first useful step was to check whether messages had reached any modem-readable SMS store. `ME`, `MT`, `SM`, and `SR` were all empty:

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

`AT+CMGL=4` returned `OK` but no `+CMGL` rows. That detail matters. When `ME`, `MT`, `SM`, and `SR` are all empty, the problem is not that QModem read the wrong ME/SM store, and it is not a full store. The SMS had not entered modem-readable storage at all.

## 3. A Common CMGL Trap in PDU Mode

Early in the session, this command returned an error:

```text
AT+CMGL="ALL"
ERROR
```

That can look like an SMS subsystem failure, but it was only a mode mismatch. The modem was in PDU mode:

```text
AT+CMGF?
+CMGF: 0

AT+CMGL=?
+CMGL: (0-4)
```

In PDU mode, list all messages with:

```text
AT+CMGL=4
```

not with:

```text
AT+CMGL="ALL"
```

`AT+CMGL="ALL"` is appropriate after switching to text mode with `AT+CMGF=1`. For verification codes, Chinese SMS, and Unicode payloads, PDU mode is usually the safer default, so this setup stayed with `AT+CMGF=0` and `AT+CMGL=4`.

## 4. SMS Storage, URC, and Notification Settings

The following baseline SMS settings were checked or applied during troubleshooting:

```text
AT+CMEE=2
AT+QURCCFG="urcport","all"
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

Their roles were:

- `AT+QURCCFG="urcport","all"`: emit URCs on all available AT ports, avoiding a mismatch between QModem's port and the manually tested AT port.
- `AT+CPMS="MT","MT","MT"`: use the modem's combined SMS view so messages do not land in `ME` or `SM` while the reader watches the other one.
- `AT+CNMI=2,1,0,0,0`: after a new SMS is stored, notify the terminal with `+CMTI`.
- `AT+CMGF=0`: keep PDU mode, which is a better fit for verification codes, Chinese text, and Unicode content.

If text mode is used instead, the matching commands are:

```text
AT+CMGF=1
AT+CMGL="ALL"
```

## 5. 5G SA Was Registered, but SMS Still Did Not Reach Storage

5G SA registration was normal, yet no SMS reached any storage. The SMS bearer preference then became interesting:

```text
AT+CGSMS?
+CGSMS: 1
```

`CGSMS=1` can be understood as preferring the traditional CS domain. That was not a good fit for this China Mobile NR5G SA case. It was changed to:

```text
AT+CGSMS=2
OK
```

`CGSMS=2` can be read as Packet domain preferred / PS preferred. This should not be treated as a universal rule: behavior can vary by operator, firmware, and registration state. For this NR5G SA case, though, continuing to prefer the traditional CS domain was not the right direction.

## 6. The Key Finding: IMS Was Disabled

The decisive check was IMS:

```text
AT+QCFG="ims"
+QCFG: "ims",0,0
```

IMS was disabled. It was then enabled:

```text
AT+QCFG="ims",1
OK
```

After rebooting the modem, SMS reception recovered. In this RM502Q-AE on China Mobile NR5G SA case, the critical fix was not clearing storage or changing how QModem read messages. It was enabling IMS.

## 7. Fix Steps

The core fix was:

```text
AT+CMEE=2
AT+QCFG="ims",1
AT+CFUN=1,1
```

After the modem rebooted, these SMS settings were applied again:

```text
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

The actual result in this case: after IMS was enabled and the modem rebooted, QModem could receive SMS.

## 8. Rollback Steps

If enabling IMS causes registration, dial-up, or network issues, roll it back with:

```text
AT+QCFG="ims",0
AT+CFUN=1,1
```

In this case, however, enabling IMS was the action that restored SMS reception, so the final recommendation is to keep:

```text
AT+QCFG="ims",1
```

If the SMS bearer preference needs to be rolled back:

```text
AT+CGSMS=1
```

That is not recommended as the final state for this NR5G SA case, because SMS was restored while using:

```text
AT+CGSMS: 2
```

## 9. Suggested QModem Post-Init AT Commands

Add this block to QModem's post-initialization AT commands:

```text
AT+QCFG="ims",1
AT+QURCCFG="urcport","all"
AT+CGSMS=2
AT+CSMS=1
AT+CMGF=0
AT+CPMS="MT","MT","MT"
AT+CNMI=2,1,0,0,0
```

This does not depend on `AT&W`. During the actual troubleshooting, `AT&W` did not reliably return `OK`, and the OpenWrt/QModem workflow is better served by replaying critical initialization commands after startup. That keeps the SMS state predictable even if profile persistence is uncertain.

## 10. Follow-Up: How to Tell Whether Carrier Aggregation Is Active

After SMS recovered, carrier aggregation was checked:

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

`QCAINFO` showed only `PCC` and no `SCC`, so carrier aggregation was not active at the moment of that query. But `QENG="servingcell"` showed `NOCONN`, meaning the modem was idle or not in a connected data state. That cannot prove the modem or network does not support CA.

The right way to check is to run a speed test or a large download, then repeatedly query:

```text
AT+QCAINFO
AT+QENG="servingcell"
```

If `SCC` appears, CA is being scheduled by the network. `AT+QCFG="lteca"` returning `ERROR` only means this firmware does not support or expose that QCFG item. It does not mean CA is disabled.

For NR CA under NR5G SA, the result usually depends more on network scheduling, base station configuration, plan policy, signal quality, band combinations, and whether bands are locked. Do not write unknown AT commands blindly just to test CA, and do not disable the IMS setting that already fixed SMS reception.

## 11. Conclusion

The conclusion from this case is clear:

- The SMS store was not full.
- QModem was not merely reading the wrong `ME` or `SM` store.
- `ME`, `MT`, `SM`, and `SR` were all empty, so SMS had not entered modem-readable storage.
- The modem was on China Mobile NR5G SA, and 5G registration was normal.
- The key recovery action was enabling IMS with `AT+QCFG="ims",1`, then rebooting with `AT+CFUN=1,1`.
- After reboot, SMS reception worked.
- IMS should stay enabled, and the SMS-related settings should be fixed in QModem's post-init AT commands.
- For CA: `QCAINFO` showed only `PCC`, so CA was not active at that moment; `AT+QCFG="lteca"` returning `ERROR` does not mean CA cannot work. The right check is to watch whether `SCC` appears in `QCAINFO` during heavy traffic.
