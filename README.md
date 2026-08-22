# SenseCenter

Native control and monitoring dashboard for Acer Predator/Nitro laptops on Linux. Built on [Strictly ](https://github.com/0x7375646F/Linuwu-Sense) adds live telemetry and firmware updates that the existing GUI lacks.

**Stack:** Tauri 2 (Rust) + React + TypeScript

## Prerequisites

- [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module loaded
- User in the `linuwu_sense` group (log out and back in after being added or restart)
- [Tauri Linux deps](https://tauri.app/start/prerequisites/)

## Development

```bash
npm install
npm run tauri dev
```

## Status

Early development
