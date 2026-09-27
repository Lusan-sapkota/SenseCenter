<p align="center">
  <img src="public/logo.svg" alt="SenseCenter logo" width="128" height="128">
</p>

<h1 align="center">SenseCenter</h1>

<p align="center">
  <strong>Control and monitoring center for Acer Predator/Nitro laptops on Linux</strong>
</p>

<p align="center">
  <a href="https://github.com/Lusan-sapkota/SenseCenter/releases/tag/v0.1.0"><img src="https://img.shields.io/badge/version-0.1.0-14b8a6" alt="Version 0.1.0"></a>
  <img src="https://img.shields.io/badge/platform-Linux-8b5cf6" alt="Platform: Linux">
  <img src="https://img.shields.io/badge/built%20with-Tauri%202-24c8db" alt="Built with Tauri 2">
</p>

---

A native desktop app for Acer Predator/Nitro laptops, built on the [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module. It adds live telemetry and firmware updates that the existing GUI doesn't have.

## Features

- **Control**: thermal profiles, fan modes (Auto / Max / Custom), four-zone RGB keyboard (per-zone colors and effects), battery limiter/calibration and health, USB charging, LCD overdrive, boot animation sound, keyboard backlight timeout, screen brightness, wireless radio toggles
- **Monitoring**: CPU/GPU temps and fan speeds, CPU usage and frequency, NVIDIA GPU usage/clocks/power, RAM and swap, disk I/O and space, network throughput
- **Firmware**: fwupd device list, firmware updates, and the HSI security score
- **System**: tray icon (closing the window keeps the app in the tray), start on login, and a single `pkexec` prompt that unlocks the root-only controls for the current boot

## Download

Prebuilt **`.deb`** and **`.AppImage`** packages are on the [Releases](https://github.com/Lusan-sapkota/SenseCenter/releases) page.

**Debian / Ubuntu**

```bash
sudo apt install ./SenseCenter_0.1.0_amd64.deb
```

**AppImage (any distro)**

```bash
chmod +x SenseCenter_0.1.0_amd64.AppImage
./SenseCenter_0.1.0_amd64.AppImage
```

## Prerequisites

- The [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module is installed and loaded
- Your user is in the `linuwu_sense` group (log out and back in after you're added)
- Optional: `fwupd` for firmware updates, and the NVIDIA driver for GPU telemetry

Tested on an Acer Predator PHN16-71 (RTX 4050) running Ubuntu 26.04.

## Building from source

Install the [Tauri Linux prerequisites](https://tauri.app/start/prerequisites/), then:

```bash
npm install
npm run tauri dev      # development
npm run tauri build    # produces .deb / .rpm / .AppImage in src-tauri/target/release/bundle/
```
