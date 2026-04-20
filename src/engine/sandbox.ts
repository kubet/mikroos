import { Sandbox as LifoSandbox } from "@lifo-sh/core";

const CWD = "/workspace";

let termObj: any = null;
let ready: Promise<any> | null = null;

function boot() {
  if (!ready) {
    ready = LifoSandbox.create({
      persist: true,
      cwd: CWD,
      terminal: termObj ?? undefined,
      files: { [CWD + "/README.md"]: "# MikroOS workspace" },
    }).then((s: any) => s);
  }
  return ready;
}

export function setTerminal(term: any) {
  termObj = term;
}

export async function initSandbox() {
  await boot();
}

export async function getSandbox() {
  return boot();
}

export async function runCommand(cmd: string, timeout = 10000) {
  const s = await boot();
  const r = await s.commands.run(cmd, { cwd: CWD, timeout });
  return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", exitCode: r.exitCode ?? 0 };
}

export async function readFile(path: string): Promise<string> {
  return (await boot()).fs.readFile(path);
}

export async function writeFile(path: string, content: string) {
  await (await boot()).fs.writeFile(path, content);
}

export async function fileExists(path: string): Promise<boolean> {
  return (await boot()).fs.exists(path);
}

export async function nukeSandbox() {
  const s = await boot();
  // Wipe the virtual filesystem
  try {
    const entries = await s.fs.readdir("/workspace");
    for (const e of entries) {
      await s.commands.run(`rm -rf /workspace/${e.name}`, { cwd: "/workspace", timeout: 5000 });
    }
  } catch { /* best effort */ }
  // Re-create default file
  await s.fs.writeFile("/workspace/README.md", "# MikroOS workspace");
}
