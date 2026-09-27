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
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPLv3-blue" alt="License: GPLv3"></a>
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

This also installs `lm-sensors` if it's missing.

**AppImage (any distro)**

```bash
sudo apt install lm-sensors   # or your distro's equivalent
chmod +x SenseCenter_0.1.0_amd64.AppImage
./SenseCenter_0.1.0_amd64.AppImage
```

## Prerequisites

- The [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module is installed and loaded
- Your user is in the `linuwu_sense` group (log out and back in after you're added)
- `lm-sensors` (`sudo apt install lm-sensors`). The startup check expects it, and the `.deb` installs it for you
- Optional: `fwupd` for firmware updates, and the NVIDIA driver for GPU telemetry

## Supported devices

SenseCenter doesn't talk to the hardware directly. It reads and writes the
sysfs interface of the [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense)
kernel module, and the module handles communication with the laptop's firmware.
Which laptops work, and which features each one gets, is decided by the driver.

**Before you install, check the supported models list in the
[linuwu-sense repository](https://github.com/0x7375646F/Linuwu-Sense).** If
linuwu-sense supports your laptop, SenseCenter will too. If a feature isn't
exposed by the driver on your model, that control won't be available in SenseCenter.

SenseCenter has been tested on an Acer Predator PHN16-71 (RTX 4050) running Ubuntu 26.04.

## Good to know

- **Settings after a reboot:** SenseCenter saves your control settings (fan mode, RGB, battery limiter and the toggles) and reapplies them the first time it opens after each boot. **You need to open the app for them to come back**; until then, the laptop uses the firmware defaults. To have this happen automatically, turn on *Launch SenseCenter at System Login* (Controls → System Daemon & Autostart). At login the app starts minimized to the system tray, with no window. It reapplies your settings and then sits idle until you open it from the tray. The thermal profile, screen brightness and wireless radios aren't reapplied.
- **Low resource use when idle:** telemetry is only polled while the Monitor tab is open and the window is visible. When the app is minimized, sitting in the tray or on another tab, it stops polling and does almost nothing.
- **Lag or stutter:** this shouldn't happen, but if the app feels slow, set the polling interval on the Monitor tab to **5s**. Your choice is remembered.

## Building from source

Install the [Tauri Linux prerequisites](https://tauri.app/start/prerequisites/), then:

```bash
npm install
npm run tauri dev      # development
npm run tauri build    # produces .deb / .rpm / .AppImage in src-tauri/target/release/bundle/
```

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started, and [CHANGELOG.md](CHANGELOG.md) for release notes.

## License

SenseCenter is licensed under the [GNU General Public License v3.0 or later](LICENSE).

It depends on the [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module, which is licensed separately. SenseCenter contains no linuwu-sense code. It only uses the sysfs interface the module exposes.
