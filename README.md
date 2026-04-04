# Open Keyboard Heatmap

Open-source keyboard heatmap that visualizes your keystroke patterns. Track which keys you press the most — all data stays local on your machine.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

<a href="https://buymeacoffee.com/michaelsant0s">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="200">
</a>

BTC donations:
`bc1q273jxf4xq87qggcjfw6d8v038rwqyygcsxmw8f`

DOGE donations:
`DASGta7VgHuxUCvDh9v5cfRCFLirjs611B`

## Features

- Real-time keyboard heatmap (white → green gradient)
- Layout-aware rendering: supports QWERTY, QWERTZ, AZERTY and other system layouts
- Extended key support: ESC, Enter, Tab, Shift, Ctrl, Alt, Meta, arrows and navigation keys
- Custom in-app window controls (minimize, maximize, close)
- GitHub-style activity heatmap for daily typing intensity (last year)
- Daily and all-time keystroke statistics
- Settings page with encrypted database backup/import
- Daily debug logs in `<app-data>/logs/debug-YYYY-MM-DD.log` for troubleshooting
- Privacy-first: only aggregate daily counts stored (no sequences, no time-of-day)
- Cross-platform: Windows, macOS, Linux
- Local SQLite database — nothing leaves your machine

## Security & Privacy

This app is designed so that **even if someone steals the database, they cannot recover passwords or typed text**:

| Measure | Detail |
|---|---|
| **No sequences** | Only aggregate counts per key per day are stored |
| **No time-of-day** | Timestamps are truncated to `YYYY-MM-DD` |
| **Randomised inserts** | Database writes are Fisher-Yates shuffled |
| **Random flush interval** | Buffer is flushed every 5–30 s (random) |
| **Local only** | Zero network traffic — all data on disk |

## Prerequisites

### Linux
```bash
sudo apt install libx11-dev libxtst-dev libxt-dev libxinerama-dev \
  libx11-xcb-dev libxkbcommon-dev libxkbcommon-x11-dev libxkbfile-dev
```

For Linux, this app is designed for global capture (also when minimized).
It first uses `uiohook` and can fall back to Linux `evdev` device reading.
If both are blocked (common on locked-down Wayland setups), run under X11 for
reliable global capture.

Wayland note: there is currently no portal path that behaves like passive
"capture every key always" keylogging. GlobalShortcuts is shortcut-based, and
InputCapture is compositor-triggered (e.g. via pointer barriers), not immediate
always-on capture.

If you require always-on global key capture on Wayland, start the app with
`sudo` (for development: `sudo -E npm run dev`).

### macOS
Grant **Accessibility** permission to the app (System Preferences → Privacy & Security → Accessibility).

### Windows
No extra steps required.

## Development

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Contributing & Feature Requests

Feature requests and pull requests are very welcome.

If you want a new feature:
- open a PR (best path), or
- open an issue and support development via Buy Me a Coffee, BTC, or DOGE so I can prioritize and implement it faster.

Support is optional and does not change the AGPL license terms.

## Tech Stack

- Electron
- React
- Vite + vite-plugin-electron
- TypeScript
- SQLite (better-sqlite3)
- uiohook-napi (cross-platform global key capture)
- Vitest

## License

This project is licensed under the **GNU Affero General Public License v3.0** — see the [LICENSE](LICENSE) file for details.

---

If you find this useful, consider supporting development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/michaelsant0s)

BTC:
`bc1q273jxf4xq87qggcjfw6d8v038rwqyygcsxmw8f`

![BTC Donation QR](src/assets/btc-qr.png)

DOGE:
`DASGta7VgHuxUCvDh9v5cfRCFLirjs611B`

![DOGE Donation QR](src/assets/doge-qr.png)
