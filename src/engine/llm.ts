// ── LLM interface - wraps the Web Worker ──
import type { LLMStatus } from "./types";

type TokenCallback = (token: string) => void;
type StatusCallback = (status: LLMStatus) => void;

let worker: Worker | null = null;
let onToken: TokenCallback = () => {};
let onDone: ((text: string) => void) | null = null;
let onError: ((err: string) => void) | null = null;
let statusCb: StatusCallback = () => {};

export function initLLM(onStatus: StatusCallback) {
  statusCb = onStatus;
  worker = new Worker(new URL("./llm-worker.ts", import.meta.url), {
    type: "module",
  });

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === "status") {
      statusCb({
        state: msg.state,
        progress: msg.progress,
        message: msg.message,
      });
    } else if (msg.type === "token") {
      onToken(msg.text);
    } else if (msg.type === "done") {
      onDone?.(msg.text);
      onDone = null;
      statusCb({ state: "ready" });
    } else if (msg.type === "error") {
      onError?.(msg.message);
      onError = null;
      statusCb({ state: "error", message: msg.message });
    }
  };

  worker.postMessage({ type: "load" });
}

export function generate(
  messages: Array<{ role: string; content: string }>,
  tokenCb: TokenCallback
): Promise<string> {
  return new Promise((resolve, reject) => {
    onToken = tokenCb;
    onDone = resolve;
    onError = reject;
    worker?.postMessage({ type: "generate", messages });
  });
}

export function stopGeneration() {
  worker?.postMessage({ type: "stop" });
}
