// ── Core types for mikro engine ──

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
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: string;
  error?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, ToolParam>;
  required: string[];
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface ToolParam {
  type: string;
  description: string;
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface LLMStatus {
  state: "idle" | "loading" | "ready" | "generating" | "error";
  progress?: number;
  message?: string;
}
