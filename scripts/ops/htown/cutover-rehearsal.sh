#!/usr/bin/env bash
set -euo pipefail

RUN_ON_HTOWN="${RUN_ON_HTOWN:-scripts/ops/run-on-htown.sh}"
CUTOVER_SCRIPT="${CUTOVER_SCRIPT:-scripts/ops/htown/nginx-cutover-frsieg.sh}"
ROLLBACK_SCRIPT="${ROLLBACK_SCRIPT:-scripts/ops/htown/nginx-rollback-cutover.sh}"
CURL_BIN="${CURL_BIN:-curl}"
NPM_BIN="${NPM_BIN:-npm}"
TIMEOUT_BIN="${TIMEOUT_BIN:-timeout}"

CUTOVER_TIMEOUT_SECONDS="${CUTOVER_TIMEOUT_SECONDS:-120}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-15}"
SMOKE_TIMEOUT_SECONDS="${SMOKE_TIMEOUT_SECONDS:-180}"

AUTO_ROLLBACK="${AUTO_ROLLBACK:-false}"
DRY_RUN="false"
PREFLIGHT_ONLY="false"

log() {
  printf '%s\n' "$*"
}

log_phase() {
  local phase="$1"
  local status="$2"
  shift 2
  printf 'phase=%s status=%s %s\n' "$phase" "$status" "$*"
}

usage() {
  cat <<'USAGE'
Usage: bash scripts/ops/htown/cutover-rehearsal.sh [--dry-run] [--preflight-only] [--auto-rollback]

Required environment:
  FRSIEG_BASE_URL            Base URL to verify after cutover (e.g. https://h-town.duckdns.org)

Optional environment:
  FRSIEG_PATH_PREFIX         Path prefix for smoke runner (default: empty)
  AUTO_ROLLBACK=true         Execute rollback automatically on unhealthy/proof failure
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN="true"
      ;;
    --preflight-only)
      PREFLIGHT_ONLY="true"
      ;;
    --auto-rollback)
      AUTO_ROLLBACK="true"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ -z "${FRSIEG_BASE_URL:-}" ]]; then
  log_phase "preflight" "error" "reason=missing_env env=FRSIEG_BASE_URL"
  exit 1
fi

if [[ ! -f "$RUN_ON_HTOWN" ]]; then
  log_phase "preflight" "error" "reason=missing_file path=$RUN_ON_HTOWN"
  exit 1
fi

if [[ ! -f "$CUTOVER_SCRIPT" ]]; then
  log_phase "preflight" "error" "reason=missing_file path=$CUTOVER_SCRIPT"
  exit 1
fi

if [[ ! -f "$ROLLBACK_SCRIPT" ]]; then
  log_phase "preflight" "error" "reason=missing_file path=$ROLLBACK_SCRIPT"
  exit 1
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log_phase "preflight" "ok" "mode=dry-run base_url=$FRSIEG_BASE_URL path_prefix=${FRSIEG_PATH_PREFIX:-} auto_rollback=$AUTO_ROLLBACK"
  log_phase "cutover" "skipped" "reason=dry-run action='bash $RUN_ON_HTOWN --sudo $CUTOVER_SCRIPT'"
  log_phase "health" "skipped" "reason=dry-run endpoint=${FRSIEG_BASE_URL%/}/api/health"
  log_phase "smoke" "skipped" "reason=dry-run action='FRSIEG_BASE_URL=... npm run e2e:live'"
  exit 0
fi

log_phase "preflight" "ok" "mode=execute base_url=$FRSIEG_BASE_URL path_prefix=${FRSIEG_PATH_PREFIX:-} auto_rollback=$AUTO_ROLLBACK"

if [[ "$PREFLIGHT_ONLY" == "true" ]]; then
  log_phase "workflow" "ok" "action=preflight-only"
  exit 0
fi

run_with_optional_timeout() {
  local seconds="$1"
  shift

  if command -v "$TIMEOUT_BIN" >/dev/null 2>&1; then
    "$TIMEOUT_BIN" "$seconds" "$@"
  else
    "$@"
  fi
}

should_rollback="false"

cutover_output=""
if cutover_output="$(run_with_optional_timeout "$CUTOVER_TIMEOUT_SECONDS" bash "$RUN_ON_HTOWN" --sudo "$CUTOVER_SCRIPT" 2>&1)"; then
  log_phase "cutover" "ok" "action=nginx-cutover-frsieg.sh"
else
  code=$?
  if [[ "$code" -eq 124 ]]; then
    log_phase "cutover" "error" "reason=timeout timeout_seconds=$CUTOVER_TIMEOUT_SECONDS action=nginx-cutover-frsieg.sh"
  else
    log_phase "cutover" "error" "reason=command_failed exit_code=$code action=nginx-cutover-frsieg.sh"
  fi
  printf '%s\n' "$cutover_output" >&2
  exit "$code"
fi

health_endpoint="${FRSIEG_BASE_URL%/}/api/health"
health_raw=""
if health_raw="$(run_with_optional_timeout "$HEALTH_TIMEOUT_SECONDS" "$CURL_BIN" -fsS "$health_endpoint" 2>&1)"; then
  :
else
  code=$?
  should_rollback="true"
  if [[ "$code" -eq 124 ]]; then
    log_phase "health" "error" "reason=timeout endpoint=$health_endpoint timeout_seconds=$HEALTH_TIMEOUT_SECONDS"
  else
    log_phase "health" "error" "reason=request_failed endpoint=$health_endpoint exit_code=$code"
  fi
  printf '%s\n' "$health_raw" >&2
fi

health_status=""
if [[ "$should_rollback" != "true" ]]; then
  if health_status="$(printf '%s' "$health_raw" | node -e "
const fs = require('node:fs');
const input = fs.readFileSync(0, 'utf8').trim();
let parsed;
try { parsed = JSON.parse(input); } catch {
  console.error('invalid-json');
  process.exit(10);
}
if (parsed && parsed.ok === true) {
  console.log('ok');
  process.exit(0);
}
console.log('unhealthy');
process.exit(11);
" 2>&1)"; then
    log_phase "health" "ok" "endpoint=$health_endpoint ok=true"
  else
    code=$?
    should_rollback="true"
    case "$code" in
      10)
        log_phase "health" "error" "reason=malformed_json endpoint=$health_endpoint"
        ;;
      11)
        log_phase "health" "error" "reason=unhealthy endpoint=$health_endpoint"
        ;;
      *)
        log_phase "health" "error" "reason=health_contract_failure endpoint=$health_endpoint exit_code=$code"
        ;;
    esac
    printf '%s\n' "$health_status" >&2
  fi
fi

smoke_output=""
smoke_json=""
if smoke_output="$(run_with_optional_timeout "$SMOKE_TIMEOUT_SECONDS" env FRSIEG_BASE_URL="$FRSIEG_BASE_URL" FRSIEG_PATH_PREFIX="${FRSIEG_PATH_PREFIX:-}" "$NPM_BIN" run e2e:live 2>&1)"; then
  :
else
  code=$?
  should_rollback="true"
  if [[ "$code" -eq 124 ]]; then
    log_phase "smoke" "error" "reason=timeout action='npm run e2e:live' timeout_seconds=$SMOKE_TIMEOUT_SECONDS"
  else
    log_phase "smoke" "error" "reason=command_failed action='npm run e2e:live' exit_code=$code"
  fi
  printf '%s\n' "$smoke_output" >&2
fi

if [[ -n "$smoke_output" ]]; then
  if smoke_json="$(printf '%s\n' "$smoke_output" | node -e "
const fs = require('node:fs');
const lines = fs.readFileSync(0, 'utf8').trim().split(/\r?\n/).filter(Boolean).reverse();
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    process.stdout.write(JSON.stringify(parsed));
    process.exit(0);
  } catch {}
}
process.exit(12);
" 2>/dev/null)"; then
    if smoke_eval="$(printf '%s' "$smoke_json" | node -e "
const fs = require('node:fs');
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
const required = ['ok', 'step', 'action', 'endpoint', 'artifactPath'];
const missing = required.filter((k) => !(k in payload));
if (missing.length) {
  console.log('malformed missing=' + missing.join(','));
  process.exit(13);
}
if (payload.ok === true) {
  console.log('ok step=' + payload.step + ' action=' + payload.action + ' endpoint=' + payload.endpoint + ' artifactPath=' + payload.artifactPath);
  process.exit(0);
}
console.log('failed step=' + payload.step + ' action=' + payload.action + ' endpoint=' + payload.endpoint + ' artifactPath=' + payload.artifactPath);
process.exit(14);
")"; then
      log_phase "smoke" "ok" "$smoke_eval"
    else
      smoke_eval_code=$?
      should_rollback="true"
      if [[ "$smoke_eval_code" -eq 13 ]]; then
        log_phase "smoke" "error" "reason=malformed_payload detail='${smoke_eval}'"
      else
        log_phase "smoke" "error" "reason=proof_failed detail='${smoke_eval}'"
      fi
    fi
  else
    should_rollback="true"
    log_phase "smoke" "error" "reason=malformed_payload detail='missing_json_payload'"
  fi
fi

if [[ "$should_rollback" == "true" ]]; then
  if [[ "$AUTO_ROLLBACK" == "true" ]]; then
    rollback_output=""
    if rollback_output="$(bash "$RUN_ON_HTOWN" --sudo "$ROLLBACK_SCRIPT" 2>&1)"; then
      log_phase "rollback" "ok" "action=nginx-rollback-cutover.sh"
    else
      code=$?
      log_phase "rollback" "error" "reason=command_failed action=nginx-rollback-cutover.sh exit_code=$code"
      printf '%s\n' "$rollback_output" >&2
      exit "$code"
    fi
  else
    log_phase "decision" "no-go" "reason=failed_gate rollback='bash $RUN_ON_HTOWN --sudo $ROLLBACK_SCRIPT'"
  fi
  exit 1
fi

log_phase "decision" "go" "reason=all_gates_passed"
