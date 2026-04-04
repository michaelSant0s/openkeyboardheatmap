#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is intended for macOS."
  exit 1
fi

echo "Building macOS DMG..."
npx electron-builder --mac dmg

DMG_FILE="$(ls -t dist/*.dmg 2>/dev/null | head -n 1 || true)"
if [[ -z "${DMG_FILE}" ]]; then
  echo "No DMG file found in dist/."
  exit 1
fi

echo "Opening DMG: ${DMG_FILE}"
open "${DMG_FILE}"
