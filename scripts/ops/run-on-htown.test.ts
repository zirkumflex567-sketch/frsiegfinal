import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const RUNNER_PATH = "scripts/ops/run-on-htown.sh";

function makeExecutable(path: string, content: string) {
  writeFileSync(path, content, { mode: 0o755 });
  chmodSync(path, 0o755);
}

function makeHarness() {
  const root = mkdtempSync(join(tmpdir(), "run-on-htown-test-"));
  const mockBin = join(root, "mock-bin");
  const remoteTmp = join(root, "remote-tmp");
  const local = join(root, "local");
  const outDir = join(root, "out");

  for (const dir of [mockBin, remoteTmp, local, outDir]) {
    mkdirSync(dir, { recursive: true });
  }

  makeExecutable(
    join(mockBin, "scp"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${MOCK_SCP_FAIL:-0}" == "1" ]]; then
  echo "mock scp failure" >&2
  exit 23
fi
src="$1"
dest="$2"
remote_path="\${dest#*:}"
cp "$src" "$remote_path"
`,
  );

  makeExecutable(
    join(mockBin, "ssh"),
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${MOCK_SSH_FAIL:-0}" == "1" ]]; then
  echo "mock ssh failure" >&2
  exit 29
fi
host="$1"
shift
if [[ -n "\${MOCK_SSH_ARGS_LOG:-}" ]]; then
  printf '%s\n' "$host" "$@" > "$MOCK_SSH_ARGS_LOG"
fi
if [[ $# -eq 0 ]]; then
  exit 0
fi
"$@"
`,
  );

  makeExecutable(
    join(mockBin, "sudo"),
    `#!/usr/bin/env bash
set -euo pipefail
exec "$@"
`,
  );

  const localScript = join(local, "echo-args.sh");
  makeExecutable(
    localScript,
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$@" > "$RUNNER_ARGS_OUT"
`,
  );

  return { root, mockBin, remoteTmp, localScript, outDir };
}

function runRunner(args: string[], env: Record<string, string>) {
  return spawnSync("bash", [RUNNER_PATH, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });
}

function toPosixPath(path: string) {
  return path.replaceAll("\\", "/");
}

afterEach((ctx) => {
  const root = (ctx.task.meta as { harnessRoot?: string }).harnessRoot;
  if (root) rmSync(root, { recursive: true, force: true });
});

describe("run-on-htown.sh", () => {
  it("fails with usage when script argument is missing", () => {
    const result = runRunner([], {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Usage:");
  });

  it("fails when local script path does not exist", () => {
    const result = runRunner(["scripts/ops/htown/does-not-exist.sh"], {});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Script not found:");
  });

  it("preserves argument boundaries with spaces and shell metacharacters", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const argsOut = join(harness.outDir, "args.txt");
    const sshLog = join(harness.outDir, "ssh-args.txt");

    const result = runRunner(
      [
        harness.localScript,
        "hello world",
        "semi;colon",
        "quoted\"value",
        "dollar$PATH",
        "asterisk*literal",
      ],
      {
        PATH: `${toPosixPath(harness.mockBin)}:${process.env.PATH ?? ""}`,
        SCP_BIN: toPosixPath(join(harness.mockBin, "scp")),
        SSH_BIN: toPosixPath(join(harness.mockBin, "ssh")),
        SUDO_BIN: toPosixPath(join(harness.mockBin, "sudo")),
        TMPDIR: harness.remoteTmp,
        RUNNER_ARGS_OUT: argsOut,
        MOCK_SSH_ARGS_LOG: sshLog,
      },
    );

    expect(result.status).toBe(0);

    const receivedArgs = readFileSync(argsOut, "utf8")
      .trimEnd()
      .split("\n");
    expect(receivedArgs).toEqual([
      "hello world",
      "semi;colon",
      'quoted"value',
      "dollar$PATH",
      "asterisk*literal",
    ]);

    const sshArgs = readFileSync(sshLog, "utf8");
    expect(sshArgs).not.toContain("$*");
  });

  it("propagates scp transfer failures with transfer-phase stderr context", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRunner([harness.localScript], {
      PATH: `${toPosixPath(harness.mockBin)}:${process.env.PATH ?? ""}`,
      SCP_BIN: toPosixPath(join(harness.mockBin, "scp")),
      SSH_BIN: toPosixPath(join(harness.mockBin, "ssh")),
      SUDO_BIN: toPosixPath(join(harness.mockBin, "sudo")),
      TMPDIR: harness.remoteTmp,
      MOCK_SCP_FAIL: "1",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("phase=transfer");
  });

  it("propagates ssh execution failures with execution-phase stderr context", (ctx) => {
    const harness = makeHarness();
    (ctx.task.meta as { harnessRoot?: string }).harnessRoot = harness.root;

    const result = runRunner(["--sudo", harness.localScript], {
      PATH: `${toPosixPath(harness.mockBin)}:${process.env.PATH ?? ""}`,
      SCP_BIN: toPosixPath(join(harness.mockBin, "scp")),
      SSH_BIN: toPosixPath(join(harness.mockBin, "ssh")),
      SUDO_BIN: toPosixPath(join(harness.mockBin, "sudo")),
      TMPDIR: harness.remoteTmp,
      MOCK_SSH_FAIL: "1",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("phase=execute");
    expect(result.stderr).toContain("remote_command=");
  });
});
