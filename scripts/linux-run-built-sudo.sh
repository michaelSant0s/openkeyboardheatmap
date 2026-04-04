#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
XHOST_GRANTED=0

cd "${PROJECT_ROOT}"

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This script is intended for Linux."
  exit 1
fi

if [[ "${EUID}" -eq 0 ]]; then
  echo "Please run this script without sudo: ./scripts/linux-run-built-sudo.sh"
  exit 1
fi

if [[ ! -x "./node_modules/.bin/electron" ]]; then
  echo "electron binary not found. Run: npm install"
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN}" ]]; then
  if [[ -n "${HOME:-}" ]]; then
    CANDIDATE_NODE="$(ls -t "${HOME}"/.nvm/versions/node/*/bin/node 2>/dev/null | head -n 1 || true)"
    if [[ -n "${CANDIDATE_NODE}" ]]; then
      NODE_BIN="${CANDIDATE_NODE}"
    fi
  fi
fi

if [[ -z "${NODE_BIN}" || ! -x "${NODE_BIN}" ]]; then
  echo "node binary not found in your user environment."
  exit 1
fi

ELECTRON_CLI="${PROJECT_ROOT}/node_modules/electron/cli.js"
if [[ ! -f "${ELECTRON_CLI}" ]]; then
  echo "Electron CLI not found at ${ELECTRON_CLI}. Run: npm install"
  exit 1
fi

if [[ "${SKIP_ELECTRON_REBUILD:-0}" != "1" ]]; then
  echo "Rebuilding native modules for Electron..."
  npm run rebuild
fi

if [[ "${SKIP_APP_BUILD:-0}" != "1" ]]; then
  echo "Building latest app artifacts..."
  npm run build
elif [[ ! -f "dist/index.html" || ! -f "dist-electron/main/main.js" || ! -f "dist-electron/preload/preload.mjs" ]]; then
  echo "Build artifacts missing. Running npm run build..."
  npm run build
fi

if [[ -z "${DISPLAY:-}" ]]; then
  export DISPLAY=":0"
fi
if [[ -z "${XAUTHORITY:-}" && -f "${HOME}/.Xauthority" ]]; then
  export XAUTHORITY="${HOME}/.Xauthority"
fi
if [[ -z "${XDG_RUNTIME_DIR:-}" && -d "/run/user/${UID}" ]]; then
  export XDG_RUNTIME_DIR="/run/user/${UID}"
fi
if [[ -z "${DBUS_SESSION_BUS_ADDRESS:-}" && -n "${XDG_RUNTIME_DIR:-}" && -S "${XDG_RUNTIME_DIR}/bus" ]]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

if command -v xhost >/dev/null 2>&1 && [[ -n "${DISPLAY:-}" ]]; then
  if xhost +SI:localuser:root >/dev/null 2>&1; then
    XHOST_GRANTED=1
    trap 'if [[ "${XHOST_GRANTED}" -eq 1 ]]; then xhost -SI:localuser:root >/dev/null 2>&1 || true; fi' EXIT
  fi
fi

echo "Starting app as root for Linux capture testing..."
sudo \
  DISPLAY="${DISPLAY:-}" \
  XAUTHORITY="${XAUTHORITY:-}" \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  ELECTRON_DISABLE_SANDBOX=1 \
  "${NODE_BIN}" "${ELECTRON_CLI}" "${PROJECT_ROOT}" --disable-gpu "$@"
