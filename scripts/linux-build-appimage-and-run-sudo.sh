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
  echo "Please run this script without sudo: ./scripts/linux-build-appimage-and-run-sudo.sh"
  exit 1
fi

echo "Building Linux AppImage..."
npx electron-builder --linux AppImage

APPIMAGE="$(ls -t dist/*.AppImage 2>/dev/null | head -n 1 || true)"
if [[ -z "${APPIMAGE}" ]]; then
  echo "No AppImage found in dist/."
  exit 1
fi

chmod +x "${APPIMAGE}"
echo "Starting AppImage as root: ${APPIMAGE}"

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

sudo \
  DISPLAY="${DISPLAY:-}" \
  XAUTHORITY="${XAUTHORITY:-}" \
  XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-}" \
  DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-}" \
  "${APPIMAGE}" --no-sandbox --disable-gpu "$@"
