// ── Agentic loop - the core of mikro ──
import type { Message, ToolCall } from "./types";
import { generate } from "./llm";
import { getToolsForPrompt, findTool } from "./tools";

const SYSTEM_PROMPT = `You are mikro, a minimal but capable coding agent running entirely in the browser.
You have access to a virtual Linux sandbox with a filesystem and shell commands.

Available tools:
${getToolsForPrompt()}

To use a tool, respond with a tool_call block:
<tool_call>
{"name": "tool_name", "arguments": {"param": "value"}}
</tool_call>

You can make multiple tool calls in one response. After each tool call, you will receive the result and can continue.

Rules:
- Think step by step before acting
- Use bash for complex operations (piping, chaining commands)
- Use read/write/edit for file operations
- Use grep/glob to search the codebase
- Use web_search when you need current information
- Be concise in your responses
- When you're done with a task, summarize what you did
- Files live under /home/user/ by default`;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const re = /<tool_call>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g;
  let m;
  while ((m = re.exec(text))) {
    try {
      const parsed = JSON.parse(m[1]);
      calls.push({
        id: uid(),
        name: parsed.name,
        arguments: parsed.arguments || {},
      });
    } catch {
      // skip malformed
    }
  }
  return calls;
}

function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
}

export type OnMessage = (msg: Message) => void;
export type OnToken = (token: string) => void;

export async function runAgent(
  userMessage: string,
  history: Message[],
  onMessage: OnMessage,
  onToken: OnToken
): Promise<void> {
  // Build conversation for LLM
  const conv: Array<{ role: string; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add history (last 20 messages for context window)
  const recent = history.slice(-20);
  for (const msg of recent) {
    if (msg.role === "tool") {
      conv.push({ role: "user", content: `<tool_response id="${msg.toolCallId}">\n${msg.content}\n</tool_response>` });
    } else {
      conv.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the new user message
  conv.push({ role: "user", content: userMessage });

  // Agentic loop - keep going while model makes tool calls
  const MAX_ITERATIONS = 10;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let fullText = "";
    const response = await generate(conv, (token) => {
      fullText += token;
      onToken(token);
    });

    const toolCalls = parseToolCalls(response);
    const textContent = stripToolCalls(response);

    // Emit assistant message
    const assistantMsg: Message = {
      id: uid(),
      role: "assistant",
      content: textContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      timestamp: Date.now(),
    };
    onMessage(assistantMsg);

    // If no tool calls, we're done
    if (toolCalls.length === 0) break;

    // Execute tools and feed results back
    for (const call of toolCalls) {
      const tool = findTool(call.name);
      let result: string;
      if (tool) {
        try {
          result = await tool.execute(call.arguments);
        } catch (e: any) {
          result = `Error: ${e.message}`;
        }
      } else {
        result = `Unknown tool: ${call.name}`;
      }

      // Truncate very long results
      if (result.length > 4000) {
        result = result.slice(0, 4000) + "\n... (truncated)";
      }

      const toolMsg: Message = {
        id: uid(),
        role: "tool",
        content: result,
        toolCallId: call.id,
        timestamp: Date.now(),
      };
      onMessage(toolMsg);

      // Add to conversation
      conv.push({ role: "assistant", content: response });
      conv.push({
        role: "user",
        content: `<tool_response id="${call.id}" tool="${call.name}">\n${result}\n</tool_response>`,
      });
    }

    // Reset token stream for next iteration
    onToken("\n");
  }
}
