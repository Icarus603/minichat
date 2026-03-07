#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(grep -m1 '"version"' "$ROOT_DIR/package.json" | sed -E 's/.*"version": "([^"]+)".*/\1/')"

OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"

if [[ "$OS_NAME" != "Darwin" ]]; then
  echo "MiniChat release packaging currently supports macOS only." >&2
  exit 1
fi

PLATFORM="macos"

case "$ARCH_NAME" in
  arm64|aarch64) ARCH="arm64" ;;
  x86_64) ARCH="x64" ;;
  *)
    echo "Unsupported architecture: $ARCH_NAME" >&2
    exit 1
    ;;
esac

BUILD_DIR="$ROOT_DIR/build"
RELEASE_DIR="$ROOT_DIR/release"
ARTIFACT_NAME="minichat-${VERSION}-${PLATFORM}-${ARCH}"
ARCHIVE_PATH="$RELEASE_DIR/${ARTIFACT_NAME}.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR" "$RELEASE_DIR"

pushd "$ROOT_DIR" >/dev/null
bun run build
bun build src/cli.tsx --compile --outfile "$BUILD_DIR/minichat"
popd >/dev/null

rm -f "$ARCHIVE_PATH"
(cd "$BUILD_DIR" && zip -qr "$ARCHIVE_PATH" minichat)

if command -v shasum >/dev/null 2>&1; then
  CHECKSUM="$(shasum -a 256 "$ARCHIVE_PATH" | awk '{print $1}')"
elif command -v sha256sum >/dev/null 2>&1; then
  CHECKSUM="$(sha256sum "$ARCHIVE_PATH" | awk '{print $1}')"
else
  CHECKSUM=""
fi

echo "Built: $ARCHIVE_PATH"
if [[ -n "$CHECKSUM" ]]; then
  echo "SHA256: $CHECKSUM"
fi
