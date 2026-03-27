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

log_error() {
  local message="$1"
  shift
  printf '%s %s\n' "$message" "$*" >&2
}

quote_args() {
  local quoted=""
  local arg
  for arg in "$@"; do
    printf -v quoted '%s%q ' "$quoted" "$arg"
  done
  printf '%s' "${quoted% }"
}

SCP_BIN="${SCP_BIN:-scp}"
SSH_BIN="${SSH_BIN:-ssh}"
SUDO_BIN="${SUDO_BIN:-sudo}"

USE_SUDO="false"
if [[ "${1:-}" == "--sudo" ]]; then
  USE_SUDO="true"
  shift
fi

if [[ $# -lt 1 ]]; then
  log_error "Usage:" "$0 [--sudo] <local_script_path> [args...]"
  exit 1
fi

LOCAL_SCRIPT="$1"
shift

if [[ ! -f "$LOCAL_SCRIPT" ]]; then
  log_error "Script not found:" "$LOCAL_SCRIPT"
  exit 1
fi

SCRIPT_BASENAME="$(basename "$LOCAL_SCRIPT")"
REMOTE_SCRIPT="/tmp/${SCRIPT_BASENAME%.sh}-$(date +%s).sh"

if "$SCP_BIN" "$LOCAL_SCRIPT" "htown:${REMOTE_SCRIPT}" >/dev/null; then
  :
else
  code=$?
  log_error "phase=transfer status=error" "exit_code=${code} local_script=${LOCAL_SCRIPT} remote_script=${REMOTE_SCRIPT}"
  exit "$code"
fi

SSH_CMD=("$SSH_BIN" htown bash -s -- "$REMOTE_SCRIPT" "$USE_SUDO" "$SUDO_BIN" "$@")

if "${SSH_CMD[@]}" <<'REMOTE_EXEC'; then
set -euo pipefail

remote_script="$1"
use_sudo="$2"
sudo_bin="$3"
shift 3

chmod +x "$remote_script"
if [[ "$use_sudo" == "true" ]]; then
  "$sudo_bin" "$remote_script" "$@"
else
  "$remote_script" "$@"
fi
REMOTE_EXEC
  :
else
  code=$?
  log_error "phase=execute status=error" "exit_code=${code} remote_command=$(quote_args "${SSH_CMD[@]}")"
  exit "$code"
fi
