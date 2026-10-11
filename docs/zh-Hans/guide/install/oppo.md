---
sidebar: { "label": "OPPO 设备", "order": 20, "group": "Get started", "parent": "/guide/install" }
---

# OPPO 设备

本页用于介绍 OPPO 设备的 BakaSU 安装流程。

::: warning
刷写前请备份重要数据，并准备好与当前系统版本匹配的原厂镜像。
:::

## LKM 安装

LKM 安装与正常 GKI 设备无任何区别，请参见：[一般 GKI 设备的 LKM 安装](./gki#lkm)。

## GKI 安装

OPPO 设备由于 `f2fs` 的相关修改，导致无法使用通用 GKI 镜像，你需要自行基于 oppo 的开源代码自编译内核，请参阅 [GKI 设备内核编译指南](./gki#built-in)。

这里也有一些其他项目使用 `GitHub Action` 快速编译带 `BakaSU` 的内核镜像

<!-- devices: oppo_kernel_action_build.json -->
