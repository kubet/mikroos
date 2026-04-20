export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface Tool {
  name: string;
  params: string; // e.g. "path,content" — just the param names
  description: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export type LLMState = "idle" | "loading" | "ready" | "generating" | "error";
