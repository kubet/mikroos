import { describe, it, expect } from "vitest";
import { parseToolCalls, stripToolCalls } from "../src/engine/agent";

describe("parseToolCalls", () => {
  it("parses flat JSON tool call", () => {
    const text = '{"tool":"bash","command":"ls -la"}';
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("bash");
    expect(calls[0].args).toEqual({ command: "ls -la" });
  });

  it("parses tool call with surrounding text", () => {
    const text = 'I\'ll check that.\n{"tool":"bash","command":"ls"}';
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("bash");
  });

  it("parses write with multiline content", () => {
    const text = '{"tool":"write","path":"/workspace/x.txt","content":"line1\\nline2"}';
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("write");
    expect(calls[0].args.path).toBe("/workspace/x.txt");
  });

  it("returns empty for no tool calls", () => {
    expect(parseToolCalls("just a normal message")).toEqual([]);
  });

  it("skips malformed JSON", () => {
    expect(parseToolCalls('{"tool": not json}')).toEqual([]);
  });

  it("skips unknown tool names", () => {
    expect(parseToolCalls('{"tool":"fakeTool","x":"y"}')).toEqual([]);
  });

  it("parses legacy format as fallback", () => {
    const text = '{"name":"bash","arguments":{"command":"pwd"}}';
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("bash");
    expect(calls[0].args).toEqual({ command: "pwd" });
  });

  it("prefers new format over legacy", () => {
    const text = '{"tool":"bash","command":"ls"}';
    const calls = parseToolCalls(text);
    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe("bash");
    expect(calls[0].args).toEqual({ command: "ls" });
  });
});

describe("stripToolCalls", () => {
  it("strips flat JSON tool calls", () => {
    const text = 'hello\n{"tool":"bash","command":"ls"}\ndone.';
    expect(stripToolCalls(text)).toBe("hello\n\ndone.");
  });

  it("strips legacy format", () => {
    const text = 'hi\n{"name":"write","arguments":{"path":"/x","content":"y"}}';
    expect(stripToolCalls(text)).toBe("hi");
  });

  it("returns full text when no tool calls", () => {
    expect(stripToolCalls("just text")).toBe("just text");
  });

  it("handles text that is only a tool call", () => {
    expect(stripToolCalls('{"tool":"bash","command":"ls"}')).toBe("");
  });
});
