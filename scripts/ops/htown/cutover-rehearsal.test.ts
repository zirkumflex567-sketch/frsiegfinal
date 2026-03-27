import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = "scripts/ops/htown/cutover-rehearsal.sh";

function makeExecutable(path: string, content: string) {
  writeFileSync(path, content, { mode: 0o755 });
  chmodSync(path, 0o755);
}

function toPosixPath(path: string) {
  return path.replaceAll("\\", "/");
}

function makeHarness() {
  const root = mkdtempSync(join(tmpdir(), "cutover-rehearsal-test-"));
  const binDir = join(root, "bin");
  const scriptsDir = join(root, "scripts");
  const logDir = join(root, "log");

  mkdirSync(binDir, { recursive: true });
  mkdirSync(scriptsDir, { recursive: true });
  mkdirSync(logDir, { recursive: true });

  const cutoverScript = join(scriptsDir, "cutover.sh");
  const rollbackScript = join(scriptsDir, "rollback.sh");
  const runOnHtown = join(scriptsDir, "run-on-htown.sh");

  makeExecutable(cutoverScript, "#!/usr/bin/env bash\nset -euo pipefail\necho cutover\n");
  makeExecutable(rollbackScript, "#!/usr/bin/env bash\nset -euo pipefail\necho rollback\n");

  makeExecutable(
    runOnHtown,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> "$RUN_LOG"
if [[ "\${MOCK_RUN_ON_FAIL:-0}" == "1" && "$*" == *"cutover.sh"* ]]; then
  echo "mock cutover failure" >&2
  exit 42
fi
if [[ "\${MOCK_ROLLBACK_FAIL:-0}" == "1" && "$*" == *"rollback.sh"* ]]; then
  echo "mock rollback failure" >&2
  exit 43
fi
`,
  );

  makeExecutable(
    join(binDir, "curl"),
    `#!/usr/bin/env bash
set -euo pipefail
mode="\${MOCK_HEALTH_MODE:-ok}"
case "$mode" in
  ok) echo '{"ok":true,"service":"healthy"}' ;;
  unhealthy) echo '{"ok":false,"service":"degraded"}' ;;
  malformed) echo 'not-json' ;;
  fail) echo 'curl failure' >&2; exit 7 ;;
  *) echo '{"ok":true}' ;;
esac
`,
  );

  makeExecutable(
    join(binDir, "npm"),
    `#!/usr/bin/env bash
set -euo pipefail
mode="\${MOCK_SMOKE_MODE:-ok}"
case "$mode" in
  ok)
    echo '{"ok":true,"step":"done","action":"assert-public-home","endpoint":"/","artifactPath":"/.gsd/proof.png"}'
    ;;
  fail)
    echo '{"ok":false,"step":"save","action":"save-content","endpoint":"/api/admin/pages/:id","artifactPath":"/.gsd/error.png"}'
    exit 1
    ;;
  malformed)
    echo 'smoke output without json'
    ;;
  *)
    echo '{"ok":true,"step":"done","action":"assert-public-home","endpoint":"/","artifactPath":"/.gsd/proof.png"}'
    ;;
esac
`,
  );

  return {
    root,
    binDir,
    cutoverScript,
    rollbackScript,
    runOnHtown,
    runLog: join(logDir, "run.log"),
  };
}

function runRehearsal(args: string[], env: Record<string, string>) {
  return spawnSync("bash", [SCRIPT_PATH, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

afterEach((ctx) => {
  const root = (ctx.task.meta as { harnessRoot?: string }).harnessRoot;
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("cutover-rehearsal.sh", () => {
  it("fails preflight when FRSIEG_BASE_URL is missing", () => {
    const result = runRehearsal([], {});
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("phase=preflight status=error reason=missing_env env=FRSIEG_BASE_URL");
  });

  it("stops on cutover command failure before smoke phase", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRehearsal([], {
      FRSIEG_BASE_URL: "http://localhost:3000",
      RUN_ON_HTOWN: toPosixPath(harness.runOnHtown),
      CUTOVER_SCRIPT: toPosixPath(harness.cutoverScript),
      ROLLBACK_SCRIPT: toPosixPath(harness.rollbackScript),
      CURL_BIN: toPosixPath(join(harness.binDir, "curl")),
      NPM_BIN: toPosixPath(join(harness.binDir, "npm")),
      RUN_LOG: harness.runLog,
      MOCK_RUN_ON_FAIL: "1",
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain("phase=cutover status=error");
    expect(output).not.toContain("phase=smoke");
  });

  it("marks no-go when health is unhealthy and prints rollback command", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRehearsal([], {
      FRSIEG_BASE_URL: "http://localhost:3000",
      RUN_ON_HTOWN: toPosixPath(harness.runOnHtown),
      CUTOVER_SCRIPT: toPosixPath(harness.cutoverScript),
      ROLLBACK_SCRIPT: toPosixPath(harness.rollbackScript),
      CURL_BIN: toPosixPath(join(harness.binDir, "curl")),
      NPM_BIN: toPosixPath(join(harness.binDir, "npm")),
      RUN_LOG: harness.runLog,
      MOCK_HEALTH_MODE: "unhealthy",
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain("phase=health status=error reason=unhealthy");
    expect(output).toContain("phase=decision status=no-go");
    expect(output).toContain("rollback='bash");
  });

  it("marks no-go when smoke payload reports ok:false", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRehearsal([], {
      FRSIEG_BASE_URL: "http://localhost:3000",
      RUN_ON_HTOWN: toPosixPath(harness.runOnHtown),
      CUTOVER_SCRIPT: toPosixPath(harness.cutoverScript),
      ROLLBACK_SCRIPT: toPosixPath(harness.rollbackScript),
      CURL_BIN: toPosixPath(join(harness.binDir, "curl")),
      NPM_BIN: toPosixPath(join(harness.binDir, "npm")),
      RUN_LOG: harness.runLog,
      MOCK_SMOKE_MODE: "fail",
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(1);
    expect(output).toContain("phase=smoke status=error reason=proof_failed");
    expect(output).toContain("phase=decision status=no-go");
  });

  it("supports dry-run mode without invoking remote commands", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRehearsal(["--dry-run"], {
      FRSIEG_BASE_URL: "http://localhost:3000",
      RUN_ON_HTOWN: toPosixPath(harness.runOnHtown),
      CUTOVER_SCRIPT: toPosixPath(harness.cutoverScript),
      ROLLBACK_SCRIPT: toPosixPath(harness.rollbackScript),
      CURL_BIN: toPosixPath(join(harness.binDir, "curl")),
      NPM_BIN: toPosixPath(join(harness.binDir, "npm")),
      RUN_LOG: harness.runLog,
    });

    const output = `${result.stdout}${result.stderr}`;
    expect(result.status).toBe(0);
    expect(output).toContain("phase=cutover status=skipped reason=dry-run");
    expect(output).toContain("phase=smoke status=skipped reason=dry-run");
    expect(() => readFileSync(harness.runLog, "utf8")).toThrow();
  });
});
