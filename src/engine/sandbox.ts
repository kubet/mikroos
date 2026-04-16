// ── Browser sandbox via lifo-sh ──
import { Sandbox as LifoSandbox } from "@lifo-sh/core";

let sandbox: any = null;

export async function initSandbox(): Promise<void> {
  if (sandbox) return;
  sandbox = await LifoSandbox.create({
    persist: true,
    cwd: "/home/user",
    files: {
      "/home/user/.bashrc": 'export PS1="mikro$ "',
      "/home/user/README.md": "# mikro workspace\nYour files live here.",
    },
  });
}

export async function runCommand(
  cmd: string,
  opts?: { cwd?: string; timeout?: number }
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  if (!sandbox) await initSandbox();
  const result = await sandbox.commands.run(cmd, {
    cwd: opts?.cwd ?? "/home/user",
    timeout: opts?.timeout ?? 10000,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.exitCode ?? 0,
  };
}

export async function readFile(path: string): Promise<string> {
  if (!sandbox) await initSandbox();
  return sandbox.fs.readFile(path);
}

export async function writeFile(path: string, content: string): Promise<void> {
  if (!sandbox) await initSandbox();
  await sandbox.fs.writeFile(path, content);
}

export async function fileExists(path: string): Promise<boolean> {
  if (!sandbox) await initSandbox();
  return sandbox.fs.exists(path);
}

export async function listDir(path: string): Promise<string[]> {
  if (!sandbox) await initSandbox();
  const entries = await sandbox.fs.readdir(path);
  return entries.map((e: any) => (e.type === "directory" ? e.name + "/" : e.name));
}

export function getSandbox() {
  return sandbox;
}
