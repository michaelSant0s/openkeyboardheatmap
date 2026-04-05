#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/release-macos-artifacts.sh vX.X[.X]
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

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: this script must run on macOS."
  exit 1
fi

MAC_ARCH="$(uname -m)"
case "${MAC_ARCH}" in
  arm64) BUILD_ARCH="arm64" ;;
  x86_64) BUILD_ARCH="x64" ;;
  *)
    echo "Error: unsupported macOS architecture: ${MAC_ARCH}"
    exit 1
    ;;
esac

OUT_DIR="${PROJECT_ROOT}/release-artifacts/${RELEASE_TAG}"

cd "${PROJECT_ROOT}"

echo "Building macOS DMG (${BUILD_ARCH})..."
npx electron-builder --mac dmg --"${BUILD_ARCH}" --publish never

DMG="$(ls -t dist/*.dmg 2>/dev/null | head -n 1 || true)"
if [[ -z "${DMG}" ]]; then
  echo "Error: no DMG found in dist/."
  exit 1
fi

mkdir -p "${OUT_DIR}"
cp -f "${DMG}" "${OUT_DIR}/"

(
  cd "${OUT_DIR}"
  shasum -a 256 "$(basename "${DMG}")" > SHA256SUMS-macos.txt
)

echo
echo "macOS artifacts prepared in:"
echo "  ${OUT_DIR}"
ls -lah "${OUT_DIR}/$(basename "${DMG}")" "${OUT_DIR}/SHA256SUMS-macos.txt"
