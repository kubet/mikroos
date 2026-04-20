import { describe, it, expect } from "vitest";
import { initSandbox, runCommand, readFile, writeFile, fileExists } from "../src/engine/sandbox";

describe("sandbox", () => {
  it("initializes without error", async () => {
    await initSandbox();
  });

  it("runs basic shell commands", async () => {
    const { stdout, exitCode } = await runCommand("echo hello");
    expect(stdout.trim()).toBe("hello");
    expect(exitCode).toBe(0);
  });

  it("returns exit code for failed commands", async () => {
    const { exitCode } = await runCommand("false");
    expect(exitCode).not.toBe(0);
  });

  it("writes and reads files", async () => {
    await writeFile("/tmp/test.txt", "hello mikro");
    const content = await readFile("/tmp/test.txt");
    expect(content).toBe("hello mikro");
  });

  it("checks file existence", async () => {
    await writeFile("/tmp/exists.txt", "x");
    expect(await fileExists("/tmp/exists.txt")).toBe(true);
    expect(await fileExists("/tmp/nope.txt")).toBe(false);
  });

  it("runs piped commands", async () => {
    await writeFile("/tmp/lines.txt", "a\nb\nc\na\nb");
    const { stdout } = await runCommand("cat /tmp/lines.txt | sort | uniq");
    const lines = stdout.trim().split("\n");
    expect(lines).toEqual(["a", "b", "c"]);
  });

  it("has default workspace file", async () => {
    expect(await fileExists("/workspace/README.md")).toBe(true);
    const content = await readFile("/workspace/README.md");
    expect(content).toMatch(/mikro/i);
  });

  it("supports grep", async () => {
    await writeFile("/tmp/searchme.txt", "line one\nfind THIS\nline three");
    const { stdout } = await runCommand("grep THIS /tmp/searchme.txt");
    expect(stdout).toContain("find THIS");
  });

  it("supports find", async () => {
    await runCommand("mkdir -p /tmp/findtest");
    await writeFile("/tmp/findtest/a.js", "x");
    const { stdout } = await runCommand('find /tmp/findtest -name "*.js"');
    expect(stdout).toContain("a.js");
  });
});
