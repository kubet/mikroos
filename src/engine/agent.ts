import type { Message, ToolCall } from "./types";
import { uid } from "./uid";
import { generate } from "./llm";
import { toolsPrompt, findTool, tools } from "./tools";

const TOOL_NAMES = new Set(tools.map((t) => t.name));

// Dynamic system prompt — built fresh each call with date + online status
function buildSystem(): string {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const online = navigator.onLine;

  return `MikroOS. agent. /workspace. lifo virtual OS. ${date}. ${online ? "online" : "OFFLINE"}.

NO npm/npx/node. packages: bash("lifo install <pkg>").
${online ? "online: CDN ok (unpkg/esm.sh). search/web_fetch work." : "OFFLINE: no CDN, no search, no web. write fully self-contained html."}
preview(path) renders html in UI.

${toolsPrompt()}

call: {"tool":"name","param":"value"}
search skill → open → follow → write files → preview.
prefer offline html (inline css/js). use CDN only if specifically asked.
no thinking. just tool calls.`;
}

// Few-shot: search → open → write → preview. Concise.
const FEW_SHOT: Array<{ role: "user" | "assistant"; content: string }> = [
  { role: "user", content: "make a simple app" },
  { role: "assistant", content: '{"tool":"search","query":"site"}' },
  { role: "user", content: "skills:\n  site - Static HTML + CSS + JS website (open to learn how)" },
  { role: "assistant", content: '{"tool":"open","target":"site"}' },
  { role: "user", content: "# Static Site\nCreate in /workspace:\n## index.html\n...\n## style.css\n...\nWrite each file." },
  { role: "assistant", content: '{"tool":"write","path":"/workspace/index.html","content":"<!DOCTYPE html><html><head><link rel=\\"stylesheet\\" href=\\"style.css\\"></head><body><h1>App</h1></body></html>"}' },
  { role: "user", content: "Written: /workspace/index.html" },
  { role: "assistant", content: '{"tool":"write","path":"/workspace/style.css","content":"body{margin:2rem;font-family:sans-serif;background:#111;color:#eee}"}' },
  { role: "user", content: "Written: /workspace/style.css" },
  { role: "assistant", content: '{"tool":"preview","path":"/workspace/index.html"}' },
  { role: "user", content: "__PREVIEW__<!DOCTYPE html>..." },
  { role: "assistant", content: "done. 2 files created." },
];

// Parse tool calls: {"tool":"name",...} or legacy {"name":"x","arguments":{}}
export function parseToolCalls(text: string): ToolCall[] {
  const out: ToolCall[] = [];

  // Find {"tool": ...} objects by brace-depth
  for (const re of [/\{\s*"tool"\s*:/g, /\{\s*"name"\s*:/g]) {
    if (out.length) break; // first format wins
    const starts = [...text.matchAll(re)];
    for (const start of starts) {
      const sub = text.slice(start.index!);
      let depth = 0, end = -1;
      for (let i = 0; i < sub.length; i++) {
        if (sub[i] === "{") depth++;
        else if (sub[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end < 0) continue;
      try {
        const obj = JSON.parse(sub.slice(0, end + 1));
        // New format: {"tool":"bash","command":"ls"}
        if (obj.tool && TOOL_NAMES.has(obj.tool)) {
          const { tool: _, ...args } = obj;
          out.push({ id: uid(), name: obj.tool, args });
        }
        // Legacy: {"name":"bash","arguments":{"command":"ls"}}
        else if (obj.name && TOOL_NAMES.has(obj.name)) {
          out.push({ id: uid(), name: obj.name, args: obj.arguments || {} });
        }
      } catch { /* skip */ }
    }
  }
  return out;
}

export function stripToolCalls(text: string): string {
  let s = text;
  for (const re of [/\{\s*"tool"\s*:/g, /\{\s*"name"\s*:/g]) {
    const starts = [...s.matchAll(re)];
    for (let i = starts.length - 1; i >= 0; i--) {
      const sub = s.slice(starts[i].index!);
      let depth = 0, end = -1;
      for (let j = 0; j < sub.length; j++) {
        if (sub[j] === "{") depth++;
        else if (sub[j] === "}") { depth--; if (depth === 0) { end = j; break; } }
      }
      if (end >= 0) {
        try {
          const obj = JSON.parse(sub.slice(0, end + 1));
          if ((obj.tool && TOOL_NAMES.has(obj.tool)) || (obj.name && TOOL_NAMES.has(obj.name)))
            s = s.slice(0, starts[i].index!) + s.slice(starts[i].index! + end + 1);
        } catch { /* not a tool call */ }
      }
    }
  }
  return s.trim();
}

const MAX_HISTORY = 12; // bigger models can use more context
const MAX_RESULT_LEN = 3000;

function toConv(msgs: Message[]) {
  return msgs.slice(-MAX_HISTORY).map((m) =>
    m.role === "tool"
      ? { role: "user" as const, content: m.content }
      : { role: m.role as "user" | "assistant", content: m.content }
  );
}

export type OnMessage = (msg: Message) => void;
export type OnToken = (token: string) => void;
export type OnReset = () => void;

export async function runAgent(
  text: string,
  history: Message[],
  onMessage: OnMessage,
  onToken: OnToken,
  onReset?: OnReset,
) {
  const conv = [
    { role: "system" as const, content: buildSystem() },
    ...FEW_SHOT,
    ...toConv(history),
    { role: "user" as const, content: text },
  ];

  let lastCallSig = "";
  let repeatCount = 0;

  for (let i = 0; i < 15; i++) {
    const response = await generate(conv, onToken);
    const calls = parseToolCalls(response);
    const content = stripToolCalls(response);

    // Auto-correct: malformed tool call (has "tool": but failed to parse)
    if (!calls.length && /"tool"\s*:/.test(response)) {
      conv.push({ role: "assistant", content: response });
      conv.push({ role: "user", content: 'malformed tool call. correct format: {"tool":"name","param":"value"}' });
      onReset?.();
      continue;
    }

    // Dedup: same tool call repeated = stuck
    if (calls.length) {
      const sig = JSON.stringify(calls.map((c) => ({ n: c.name, a: c.args })));
      if (sig === lastCallSig) {
        repeatCount++;
        if (repeatCount >= 2) {
          onMessage({ id: uid(), role: "assistant", content: content || "stopped (repeating same action).", timestamp: Date.now() });
          break;
        }
        conv.push({ role: "assistant", content: response });
        conv.push({ role: "user", content: "you already did this. next step or say done." });
        onReset?.();
        continue;
      }
      lastCallSig = sig;
      repeatCount = 0;
    }

    onMessage({ id: uid(), role: "assistant", content, toolCalls: calls.length ? calls : undefined, timestamp: Date.now() });
    if (!calls.length) break;

    conv.push({ role: "assistant", content: response });

    for (const call of calls) {
      const tool = findTool(call.name);
      let result = tool
        ? await tool.execute(call.args).catch((e: Error) => `Error: ${e.message}`)
        : `Unknown tool: ${call.name}`;
      if (result.length > MAX_RESULT_LEN) result = result.slice(0, MAX_RESULT_LEN) + "...(truncated)";

      onMessage({ id: uid(), role: "tool", content: result, toolCallId: call.id, timestamp: Date.now() });
      conv.push({ role: "user", content: result });
    }

    onReset?.();
  }
}

// Subagent: fresh context, shared sandbox.
export async function runSubAgent(task: string): Promise<string> {
  const { toolsPrompt: tp, findTool: ft } = await import("./tools");

  const subSys = `you are a subagent. write files in /workspace using tools.
tools: ${tp()}
format: {"tool":"name","param":"value"}
write the file, then say done.`;

  const conv: Array<{ role: string; content: string }> = [
    { role: "system", content: subSys },
    { role: "user", content: "write index.html with hello" },
    { role: "assistant", content: '{"tool":"write","path":"/workspace/index.html","content":"<html><body>Hello</body></html>"}' },
    { role: "user", content: "Written: /workspace/index.html" },
    { role: "assistant", content: "done." },
    { role: "user", content: task },
  ];

  const results: string[] = [];

  for (let i = 0; i < 8; i++) {
    const response = await generate(conv, () => {});
    const calls = parseToolCalls(response);
    const content = stripToolCalls(response);

    if (!calls.length) {
      if (content) results.push(content);
      break;
    }

    conv.push({ role: "assistant", content: response });

    for (const call of calls) {
      const tool = ft(call.name);
      let result = tool
        ? await tool.execute(call.args).catch((e: Error) => `Error: ${e.message}`)
        : `Unknown tool: ${call.name}`;
      if (result.length > 2000) result = result.slice(0, 2000) + "...(truncated)";

      results.push(`${call.name}: ${result.slice(0, 300)}`);
      conv.push({ role: "user", content: result });
    }
  }

  return results.join("\n") || "subagent: no output.";
}
