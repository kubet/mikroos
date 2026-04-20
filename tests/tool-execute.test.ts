import { describe, it, expect, beforeAll } from "vitest";
import { findTool } from "../src/engine/tools";
import { initSandbox, writeFile } from "../src/engine/sandbox";

describe("tool execution", () => {
  beforeAll(async () => {
    await initSandbox();
  });

  describe("bash", () => {
    const bash = findTool("bash")!;

    it("runs a command and returns output", async () => {
      const result = await bash.execute({ command: "echo test123" });
      expect(result.trim()).toBe("test123");
    });

    it("returns (no output) for silent commands", async () => {
      const result = await bash.execute({ command: "true" });
      expect(result).toBe("(no output)");
    });

    it("includes exit code on failure", async () => {
      const result = await bash.execute({ command: "false" });
      expect(result).toContain("[exit");
    });
  });

  describe("read", () => {
    const read = findTool("read")!;

    it("reads a file", async () => {
      await writeFile("/tmp/read-test.txt", "content here");
      const result = await read.execute({ path: "/tmp/read-test.txt" });
      expect(result).toBe("content here");
    });

    it("returns error for missing file", async () => {
      const result = await read.execute({ path: "/tmp/nope-nope.txt" });
      expect(result).toContain("Error");
    });
  });

  describe("write", () => {
    const write = findTool("write")!;

    it("creates a file", async () => {
      const result = await write.execute({ path: "/tmp/w-test.txt", content: "created" });
      expect(result).toContain("Written");
      const read = findTool("read")!;
      expect(await read.execute({ path: "/tmp/w-test.txt" })).toBe("created");
    });
  });

  describe("edit", () => {
    const edit = findTool("edit")!;

    it("replaces text in a file", async () => {
      await writeFile("/tmp/edit-test.txt", "hello world");
      const result = await edit.execute({
        path: "/tmp/edit-test.txt",
        old_string: "world",
        new_string: "mikro",
      });
      expect(result).toContain("Edited");
      const read = findTool("read")!;
      expect(await read.execute({ path: "/tmp/edit-test.txt" })).toBe("hello mikro");
    });

    it("returns error when text not found", async () => {
      await writeFile("/tmp/edit-miss.txt", "abc");
      const result = await edit.execute({
        path: "/tmp/edit-miss.txt",
        old_string: "xyz",
        new_string: "123",
      });
      expect(result).toContain("Error");
    });

    it("returns error for missing file", async () => {
      const result = await edit.execute({
        path: "/tmp/no-file.txt",
        old_string: "a",
        new_string: "b",
      });
      expect(result).toContain("Error");
    });
  });

  describe("grep", () => {
    const grep = findTool("grep")!;

    it("finds matching lines", async () => {
      await writeFile("/tmp/grep-test.txt", "line1\nTARGET\nline3");
      const result = await grep.execute({ pattern: "TARGET", path: "/tmp/grep-test.txt" });
      expect(result).toContain("TARGET");
    });

    it("returns no matches message", async () => {
      await writeFile("/tmp/grep-empty.txt", "nothing here");
      const result = await grep.execute({ pattern: "ZZZZZ", path: "/tmp/grep-empty.txt" });
      expect(result.toLowerCase()).toContain("no match");
    });
  });

  describe("search", () => {
    const search = findTool("search")!;

    it("finds skills by query", async () => {
      const result = await search.execute({ query: "react" });
      expect(result).toContain("react");
      expect(result).toContain("skill");
    });
  });

  describe("open", () => {
    const open = findTool("open")!;

    it("opens a skill and returns instructions", async () => {
      const result = await open.execute({ target: "react" });
      expect(result).toContain("index.html");
      expect(result).toContain("app.jsx");
      expect(result.toLowerCase()).toContain("write");
    });

    it("lists skills for unknown target", async () => {
      const result = await open.execute({ target: "nope" });
      expect(result).toContain("not found");
      expect(result).toContain("available skills");
    });
  });

  describe("todo", () => {
    const todo = findTool("todo")!;

    it("adds a todo", async () => {
      const result = await todo.execute({ action: "add", text: "test task" });
      expect(result).toContain("Added");
      expect(result).toContain("test task");
    });

    it("lists todos", async () => {
      await todo.execute({ action: "add", text: "listed task" });
      const result = await todo.execute({ action: "list" });
      expect(result).toContain("listed task");
    });

    it("marks todo done", async () => {
      const addResult = await todo.execute({ action: "add", text: "done task" });
      const id = addResult.match(/\((\w+)\)/)?.[1];
      const result = await todo.execute({ action: "done", text: id });
      expect(result).toContain("Done");
    });

    it("errors on unknown action", async () => {
      const result = await todo.execute({ action: "nope" });
      expect(result).toContain("Error");
    });
  });
});
