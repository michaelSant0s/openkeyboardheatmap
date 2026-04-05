#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/release-linux-artifacts.sh vX.X[.X]
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -ne 1 ]]; then
  echo "Error: missing release version."
  usage
  exit 1
fi

RELEASE_TAG="$1"
if [[ ! "${RELEASE_TAG}" =~ ^v[0-9]+(\.[0-9]+){1,2}([.-][A-Za-z0-9._-]+)?$ ]]; then
  echo "Error: version must look like vX.X or vX.X.X."
  exit 1
fi

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Error: this script must run on Linux."
  exit 1
fi

if [[ "$(uname -m)" != "x86_64" ]]; then
  echo "Error: this script currently supports Linux x64 only."
  exit 1
fi

OUT_DIR="${PROJECT_ROOT}/release-artifacts/${RELEASE_TAG}"

cd "${PROJECT_ROOT}"

echo "Building Linux AppImage..."
npx electron-builder --linux AppImage --x64 --publish never

APPIMAGE="$(ls -t dist/*.AppImage 2>/dev/null | head -n 1 || true)"
if [[ -z "${APPIMAGE}" ]]; then
  echo "Error: no AppImage found in dist/."
  exit 1
fi

mkdir -p "${OUT_DIR}"
cp -f "${APPIMAGE}" "${OUT_DIR}/"
chmod +x "${OUT_DIR}/$(basename "${APPIMAGE}")"

(
  cd "${OUT_DIR}"
  sha256sum "$(basename "${APPIMAGE}")" > SHA256SUMS-linux.txt
)

echo
echo "Linux artifacts prepared in:"
echo "  ${OUT_DIR}"
ls -lah "${OUT_DIR}/$(basename "${APPIMAGE}")" "${OUT_DIR}/SHA256SUMS-linux.txt"
