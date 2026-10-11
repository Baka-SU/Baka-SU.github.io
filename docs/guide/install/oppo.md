---
sidebar:
  { "label": "OPPO Devices", "order": 20, "group": "Get started", "parent": "/guide/install" }
---

# OPPO Devices

This page covers the BakaSU installation process for OPPO devices.

::: warning
Back up important data and prepare the stock images matching your current system version before flashing.
:::

## LKM Installation

LKM installation is identical to that on a standard GKI device. See [LKM installation for generic GKI devices](./gki#lkm).

## GKI Installation

Due to OPPO's modifications to `f2fs`, generic GKI images cannot be used. You need to compile a kernel yourself from OPPO's open-source code. See the [GKI device kernel build guide](./gki#built-in).

The following projects also use `GitHub Actions` to quickly build kernel images with `BakaSU`.

<!-- devices: oppo_kernel_action_build.json -->
