# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-27

First public release.

### Added

- Thermal profile switching
- Fan control: Auto, Max and Custom speed
- Four-zone RGB keyboard, with per-zone colors and effects
- Battery limiter, battery calibration and a battery health readout
- Toggles for USB charging, LCD overdrive, the boot animation sound and the keyboard backlight timeout
- Screen brightness and wireless radio toggles
- Live telemetry: CPU/GPU temperatures and fan speeds, CPU usage and frequency,
  NVIDIA GPU usage, clocks and power limits, RAM and swap, disk I/O and space,
  and network throughput
- Firmware page: fwupd device list, firmware updates and the HSI security score
- One-time `pkexec` unlock for root-only controls (lasts until reboot)
- Startup dependency check
- System tray icon: closing the window keeps the app in the tray
- Option to start on login
- `.deb` and `.AppImage` packages

[Unreleased]: https://github.com/Lusan-sapkota/SenseCenter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Lusan-sapkota/SenseCenter/releases/tag/v0.1.0
