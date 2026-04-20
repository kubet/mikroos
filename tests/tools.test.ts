import { describe, it, expect } from "vitest";
import { tools, findTool, toolsPrompt } from "../src/engine/tools";

describe("tool registry", () => {
  it("has all expected tools", () => {
    const names = tools.map((t) => t.name);
    expect(names).toContain("bash");
    expect(names).toContain("read");
    expect(names).toContain("write");
    expect(names).toContain("edit");
    expect(names).toContain("grep");
    expect(names).toContain("search");
    expect(names).toContain("open");
    expect(names).toContain("todo");
    expect(names).toContain("delegate");
  });

  it("each tool has required fields", () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.params).toBeDefined();
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("findTool returns the right tool", () => {
    expect(findTool("bash")?.name).toBe("bash");
    expect(findTool("search")?.name).toBe("search");
    expect(findTool("open")?.name).toBe("open");
    expect(findTool("nonexistent")).toBeUndefined();
  });

  it("toolsPrompt includes all tool names", () => {
    const prompt = toolsPrompt();
    for (const tool of tools) {
      expect(prompt).toContain(tool.name);
    }
  });
});
