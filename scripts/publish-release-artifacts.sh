#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/publish-release-artifacts.sh vX.X[.X]

Examples:
  ./scripts/publish-release-artifacts.sh v0.1
  ./scripts/publish-release-artifacts.sh v0.1.0
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
  echo "Error: version must look like vX.X or vX.X.X (optional suffix allowed)."
  exit 1
fi

OUT_DIR="${PROJECT_ROOT}/release-artifacts/${RELEASE_TAG}"
WINDOWS_STAGE_DIR="${PROJECT_ROOT}/release-artifacts/windows-exe-only"

cd "${PROJECT_ROOT}"

echo "==> Building Windows artifacts (Setup + Portable)..."
npm run build:win:exe-only

echo "==> Building Linux artifact (AppImage)..."
npx electron-builder --linux AppImage --x64 --publish never

setup_exe="$(ls -t "${WINDOWS_STAGE_DIR}"/*Setup*.exe 2>/dev/null | head -n 1 || true)"
portable_exe="$(find "${WINDOWS_STAGE_DIR}" -maxdepth 1 -type f -name '*.exe' ! -name '*Setup*' -printf '%T@ %p\n' | sort -nr | head -n 1 | cut -d' ' -f2- || true)"
linux_appimage="$(ls -t "${PROJECT_ROOT}"/dist/*.AppImage 2>/dev/null | head -n 1 || true)"

if [[ -z "${setup_exe}" || -z "${portable_exe}" || -z "${linux_appimage}" ]]; then
  echo "Error: could not locate all expected artifacts."
  echo "  setup_exe=${setup_exe:-<missing>}"
  echo "  portable_exe=${portable_exe:-<missing>}"
  echo "  linux_appimage=${linux_appimage:-<missing>}"
  exit 1
fi

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

cp -f "${setup_exe}" "${OUT_DIR}/"
cp -f "${portable_exe}" "${OUT_DIR}/"
cp -f "${linux_appimage}" "${OUT_DIR}/"
chmod +x "${OUT_DIR}/$(basename "${linux_appimage}")"

(
  cd "${OUT_DIR}"
  sha256sum ./*.AppImage ./*.exe > SHA256SUMS.txt
)

echo
echo "==> Release artifacts prepared:"
echo "    ${OUT_DIR}"
ls -lah "${OUT_DIR}"
echo
cat "${OUT_DIR}/SHA256SUMS.txt"
