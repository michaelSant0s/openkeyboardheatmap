#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This script is intended for macOS."
  exit 1
fi

if [[ ! -x "./node_modules/.bin/electron" ]]; then
  echo "electron binary not found. Run: npm install"
  exit 1
fi

if [[ ! -d "dist" || ! -d "dist-electron" ]]; then
  echo "Build output missing. Running npm run build..."
  npm run build
fi

echo "Starting app on macOS..."
echo "If global capture does not work, grant Accessibility permission to the app."
./node_modules/.bin/electron . "$@"
