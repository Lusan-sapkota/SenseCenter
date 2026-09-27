# Contributing to SenseCenter

Thanks for your interest in contributing! Bug reports, hardware test results
and pull requests are all welcome.

## Reporting bugs

Open an issue and include:

- Your laptop model (`cat /sys/class/dmi/id/product_name`)
- Your distribution and kernel version (`uname -r`)
- Your SenseCenter version, and whether you installed the `.deb`, the AppImage or a source build
- Whether the linuwu-sense module is loaded (`lsmod | grep linuwu`)
- What you expected to happen, and what happened instead

If a control is missing or does nothing on your model, it's probably a driver
issue, not a SenseCenter one. Check the
[linuwu-sense supported devices list](https://github.com/0x7375646F/Linuwu-Sense)
first.

## Development setup

1. Install the [Tauri Linux prerequisites](https://tauri.app/start/prerequisites/).
2. Install and load the [linuwu-sense](https://github.com/0x7375646F/Linuwu-Sense) kernel module.
3. Add your user to the `linuwu_sense` group, then log out and back in.
4. Run:

```bash
npm install
npm run tauri dev
```

## Before opening a pull request

- Check that everything builds cleanly:
  ```bash
  cd src-tauri && cargo check && cd ..
  npx tsc --noEmit
  ```
- Follow the code style in [AGENTS.md](AGENTS.md): at most one comment line per function, and only where the code isn't obvious.
- Read [DESIGN.md](DESIGN.md) before changing sysfs paths or permission handling.
- Keep each pull request to one change, and describe the change in the pull request so it can go into [CHANGELOG.md](CHANGELOG.md).
- Features that need root must fail gracefully without it. Never panic.

## Licensing

SenseCenter is licensed under the GPL-3.0-or-later. By contributing, you agree
that your contributions are licensed the same way. Don't copy code from other
projects unless its license is compatible with this one.
