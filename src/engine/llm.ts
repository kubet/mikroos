import type { LLMState } from "./types";
import { CreateMLCEngine, type MLCEngine, type ChatCompletionMessageParam } from "@mlc-ai/web-llm";

type StatusCb = (state: LLMState, message?: string, progress?: number) => void;

let worker: Worker | null = null;
let statusCb: StatusCb = () => {};
let onToken: (t: string) => void = () => {};
let onDone: ((t: string) => void) | null = null;
let onError: ((e: string) => void) | null = null;

// Main-thread engine for Safari (workers don't have WebGPU)
let mainEngine: MLCEngine | null = null;
let mainGenerating = false;
let useMainThread = false; // true = ignore worker status messages
let temperature = 0.6;
let currentLoadId = 0;

const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone/.test(navigator.userAgent);

function ensureWorker() {
  if (!worker) {
    worker = new Worker(new URL("./llm-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const d = e.data;
      // Ignore worker messages if we're using main-thread engine
      if (useMainThread) return;
      if (d.type === "status") statusCb(d.state, d.message, d.progress);
      else if (d.type === "token") onToken(d.text);
      else if (d.type === "done") { onDone?.(d.text); onDone = null; statusCb("ready"); }
      else if (d.type === "error") { onError?.(d.message); onError = null; statusCb("error", d.message); }
    };
  }
}

export function initLLM(onStatus: StatusCb) {
  statusCb = onStatus;
  ensureWorker();
}

export async function loadModel(engine: string, modelId: string, dtype?: string, wasmDtype?: string, _needsWebGPU?: boolean) {
  const myId = ++currentLoadId;
  ensureWorker();

  // Kill any previous main-thread engine
  if (mainEngine) { try { mainEngine.unload(); } catch {} mainEngine = null; }

  if (engine === "webllm" && isSafari) {
    // Safari: main thread (workers don't have WebGPU)
    useMainThread = true;
    // Tell worker to stop whatever it's doing
    worker?.postMessage({ type: "load", engine: "none", modelId: "" });
    try {
      statusCb("loading", `${modelId} 0%`);
      mainEngine = await CreateMLCEngine(modelId, {
        initProgressCallback: (p) => {
          if (currentLoadId !== myId) return;
          const pct = Math.round(p.progress * 100);
          statusCb("loading", `${modelId} ${pct}%`, pct);
        },
      });
      if (currentLoadId !== myId) { mainEngine?.unload(); mainEngine = null; return; }
      statusCb("ready", modelId);
    } catch (e: any) {
      if (currentLoadId !== myId) return;
      mainEngine = null;
      const msg = e?.message || String(e);
      console.error("[mikro] main load failed:", msg);
      statusCb("error", msg.slice(0, 150));
    }
  } else {
    // Non-Safari or Bonsai: use worker
    useMainThread = false;
    mainEngine = null;
    worker!.postMessage({ type: "load", engine, modelId, dtype, wasmDtype });
  }
}

export function generate(messages: Array<{ role: string; content: string }>, tokenCb: (t: string) => void): Promise<string> {
  if (mainEngine) return generateMainThread(messages as ChatCompletionMessageParam[], tokenCb);
  return new Promise((resolve, reject) => {
    onToken = tokenCb;
    onDone = resolve;
    onError = reject;
    worker?.postMessage({ type: "generate", messages });
  });
}

async function generateMainThread(messages: ChatCompletionMessageParam[], tokenCb: (t: string) => void): Promise<string> {
  if (!mainEngine) throw new Error("No model loaded. Please click on SETTINGS to select one.");
  mainGenerating = true;
  statusCb("generating");

  const stream = await mainEngine.chat.completions.create({
    messages, stream: true, temperature: temperature || 0, max_tokens: 4096, top_p: 0.9,
  });

  let text = "", inThink = false;
  for await (const chunk of stream) {
    if (!mainGenerating) break;
    let delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    if (delta.includes("<think>")) inThink = true;
    if (inThink) {
      if (delta.includes("</think>")) { delta = delta.split("</think>").slice(1).join("</think>"); inThink = false; if (!delta) continue; }
      else continue;
    }
    text += delta;
    tokenCb(delta);
  }

  statusCb("ready");
  return text;
}

export function stopGeneration() {
  if (mainEngine) { mainGenerating = false; mainEngine.interruptGenerate(); }
  worker?.postMessage({ type: "stop" });
}

export function setTemperature(value: number) {
  temperature = value;
  worker?.postMessage({ type: "temperature", value });
}
