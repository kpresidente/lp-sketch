#!/usr/bin/env bash
set -euo pipefail

LIB_DIR="${PLAYWRIGHT_LOCAL_LIB_DIR:-$HOME/.local/playwright-libs/usr/lib/x86_64-linux-gnu}"
if [[ -d "$LIB_DIR" ]]; then
  export LD_LIBRARY_PATH="$LIB_DIR${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
fi

exec "$@"
