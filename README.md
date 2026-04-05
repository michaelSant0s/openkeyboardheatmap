# Open Keyboard Heatmap

Open Keyboard Heatmap is a local-first desktop app that records aggregate key usage and turns it into a keyboard heatmap plus a compact typing dashboard. It is built for people who want to see how they actually use their keyboard without sending keystroke data to a server.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

<a href="https://buymeacoffee.com/michaelsant0s">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200">
</a>

BTC donations:
`bc1q273jxf4xq87qggcjfw6d8v038rwqyygcsxmw8f`

DOGE donations:
`DASGta7VgHuxUCvDh9v5cfRCFLirjs611B`

## Screenshots

### Keyboard Heatmap

![Keyboard heatmap screenshot](docs/screenshots/keyboard-heatmap.png)

### Stats Dashboard

![Statistics dashboard screenshot](docs/screenshots/stats-dashboard.png)

## Features

### Keyboard tab

- Live keyboard heatmap with per-key counts
- `All Time` and `Today` views
- Layout-aware labels with support for QWERTY, QWERTZ, AZERTY and other physical layouts
- Extended key coverage for modifiers, arrows, navigation keys and ISO keys
- Running totals in the title bar so you can glance at overall activity instantly

### Stats tab

- GitHub-style contribution grid for the last 365 days
- Total keystrokes, rolling 7-day and 30-day totals
- Best day, active day count, average per active day
- Current streak and longest streak

### Settings tab

- Shows database path and active debug log path
- Opens the data folder and debug log directly from the app
- Encrypted backup and restore flow for your local database

### Support tab

- Buy Me a Coffee button that opens in your system browser
- BTC and DOGE QR codes plus copy-to-clipboard actions

### Logging and troubleshooting

- Daily debug logs stored in `<app-data>/logs/debug-YYYY-MM-DD.log`
- Renderer and main-process actions are logged for capture, maintenance and external-link troubleshooting

### Privacy model

- Only aggregate counts per key and day are stored
- No key sequences
- No time-of-day history
- No remote sync or telemetry
- Everything stays on your machine

## Security & Privacy

This app is designed so that even if someone gets the database file, they still do not get typed text or password reconstruction data.

| Measure | Detail |
|---|---|
| No sequences | Only aggregate counts per key per day are stored |
| No time-of-day | Timestamps are truncated to `YYYY-MM-DD` |
| Randomized inserts | Database writes are Fisher-Yates shuffled |
| Random flush interval | Buffered writes happen after a randomized 5 to 30 second delay |
| Local only | No cloud sync, no remote database, no outbound telemetry |
| Encrypted storage | The SQLite database uses a separate local key file |

## Prerequisites

### Linux

```bash
sudo apt install libx11-dev libxtst-dev libxt-dev libxinerama-dev \
  libx11-xcb-dev libxkbcommon-dev libxkbcommon-x11-dev libxkbfile-dev
```

On Linux the app tries global capture even while minimized. It can use `uiohook` and, when available, Linux `evdev` device access. If you are testing full-device capture on Wayland or locked-down systems, running with elevated privileges may still be necessary.

### macOS

Grant Accessibility permission to the app in System Settings -> Privacy & Security -> Accessibility.

### Windows

No extra setup is normally required.

## Development

```bash
# install dependencies
npm install

# start in development
npm run dev

# run tests
npm test

# build production artifacts
npm run build
```

Linux helper scripts:

- `./scripts/linux-run-built-sudo.sh` builds the latest app and starts the built version with elevated privileges for capture testing
- `./scripts/linux-build-appimage-and-run-sudo.sh` builds an AppImage workflow for Linux packaging tests

## Release builds

- Linux AppImage: `npx electron-builder --linux AppImage --x64 --publish never`
- Windows (`Setup.exe` + `Portable.exe` only): `npm run build:win:exe-only`
- Windows output folder (exactly 2 files): `release-artifacts/windows-exe-only/`
- Combined release folder (`Setup.exe` + `Portable.exe` + `AppImage`): `./scripts/publish-release-artifacts.sh vX.X.X`
- Automated builds for both targets: GitHub Actions workflow [`.github/workflows/release-artifacts.yml`](.github/workflows/release-artifacts.yml)

## Tech Stack

- Electron
- React
- Vite
- TypeScript
- SQLite via `better-sqlite3-multiple-ciphers`
- `uiohook-napi` for global keyboard capture
- Vitest

## Contributing

Feature requests and pull requests are welcome. If you want to help prioritize work, opening a PR is the fastest path. Support is optional and does not change the AGPL license terms.

## License

This project is licensed under the GNU Affero General Public License v3.0 or later. See [LICENSE](LICENSE) for details.

---

If you find this useful, consider supporting development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/michaelsant0s)

BTC:
`bc1q273jxf4xq87qggcjfw6d8v038rwqyygcsxmw8f`

![BTC Donation QR](src/assets/btc-qr.png)

DOGE:
`DASGta7VgHuxUCvDh9v5cfRCFLirjs611B`

![DOGE Donation QR](src/assets/doge-qr.png)
