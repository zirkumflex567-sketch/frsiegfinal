#!/usr/bin/env bash
set -euo pipefail

# Safe helper: copy a local script to htown and execute it there.
# Avoids fragile multi-layer SSH quoting for complex commands.
#
# Usage:
#   bash scripts/ops/run-on-htown.sh [--sudo] <local_script_path> [args...]
#
# Examples:
#   bash scripts/ops/run-on-htown.sh scripts/ops/htown/nginx-cutover-frsieg.sh
#   bash scripts/ops/run-on-htown.sh --sudo scripts/ops/htown/nginx-cutover-frsieg.sh

USE_SUDO="false"
if [[ "${1:-}" == "--sudo" ]]; then
  USE_SUDO="true"
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--sudo] <local_script_path> [args...]"
  exit 1
fi

LOCAL_SCRIPT="$1"
shift

if [[ ! -f "$LOCAL_SCRIPT" ]]; then
  echo "Script not found: $LOCAL_SCRIPT"
  exit 1
fi

SCRIPT_BASENAME="$(basename "$LOCAL_SCRIPT")"
REMOTE_SCRIPT="/tmp/${SCRIPT_BASENAME%.sh}-$(date +%s).sh"

scp "$LOCAL_SCRIPT" "htown:${REMOTE_SCRIPT}" >/dev/null

if [[ "$USE_SUDO" == "true" ]]; then
  ssh htown "chmod +x '${REMOTE_SCRIPT}' && sudo '${REMOTE_SCRIPT}' $*"
else
  ssh htown "chmod +x '${REMOTE_SCRIPT}' && '${REMOTE_SCRIPT}' $*"
fi
