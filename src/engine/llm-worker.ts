import { CreateMLCEngine, type MLCEngine, type ChatCompletionMessageParam } from "@mlc-ai/web-llm";

let mlcEngine: MLCEngine | null = null;
let tfEngine: any = null;
let activeEngine: "webllm" | "transformers" | null = null;
let currentModel = "";
let temperature = 0.6;
let aborted = false;
let loadId = 0;

// Set by main thread (navigator.gpu may not exist in workers on iOS Safari)
let webgpuAvailable = !!(navigator as any).gpu;

const post = (msg: any) => self.postMessage(msg);

function timeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

// ── Load web-llm (Qwen) ──

async function loadWebLLM(mlcId: string, myId: number) {
  mlcEngine = null; tfEngine = null;
  mlcEngine = await CreateMLCEngine(mlcId, {
    initProgressCallback: (p) => {
      if (loadId !== myId) return;
      const pct = Math.round(p.progress * 100);
      post({ type: "status", state: "loading", progress: pct, message: `${mlcId} ${pct}%` });
    },
  });
  if (loadId !== myId) return;
  activeEngine = "webllm";
  currentModel = mlcId;
  post({ type: "status", state: "ready", message: mlcId });
}

// ── Load transformers.js (Bonsai) ──

async function loadTransformers(repo: string, dtype: string, wasmDtype: string | undefined, myId: number) {
  mlcEngine = null; tfEngine = null;
  const { pipeline } = await import("@huggingface/transformers");
  const name = repo.split("/")[1];

  // Use WebGPU if available (check both worker + main thread flag)
  const workerHasGPU = !!(navigator as any).gpu;
  const canWebGPU = workerHasGPU; // worker needs direct access to navigator.gpu
  let device: "webgpu" | "wasm" = canWebGPU ? "webgpu" : "wasm";
  let useDtype = device === "wasm" && wasmDtype ? wasmDtype : dtype;

  post({ type: "status", state: "loading", message: `${name} (${device})...` });

  try {
    tfEngine = await pipeline("text-generation", repo, {
      device, dtype: useDtype as any,
      progress_callback: (p: any) => {
        if (loadId !== myId) return;
        if (p.status === "progress" && p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          post({ type: "status", state: "loading", progress: pct, message: `${name} ${pct}%` });
        }
      },
    });
  } catch (e) {
    // WebGPU failed → try WASM with compatible dtype
    if (device === "webgpu" && wasmDtype) {
      console.warn("[mikro] WebGPU failed, trying WASM:", e);
      device = "wasm"; useDtype = wasmDtype;
      post({ type: "status", state: "loading", message: `${name} (wasm)...` });
      tfEngine = await pipeline("text-generation", repo, {
        device: "wasm", dtype: wasmDtype as any,
        progress_callback: (p: any) => {
          if (loadId !== myId) return;
          if (p.status === "progress" && p.total) {
            const pct = Math.round((p.loaded / p.total) * 100);
            post({ type: "status", state: "loading", progress: pct, message: `${name} ${pct}%` });
          }
        },
      });
    } else throw e;
  }

  if (loadId !== myId) return;
  post({ type: "status", state: "loading", message: `${name} warming up...` });
  await timeout(tfEngine.model.generate({ ...tfEngine.tokenizer("x"), max_new_tokens: 1 }), 45000, "warmup");

  if (loadId !== myId) return;
  activeEngine = "transformers";
  currentModel = repo;
  post({ type: "status", state: "ready", message: `${name} (${device})` });
}

// ── Load dispatcher ──

async function load(engine: string, modelId: string, dtype?: string, wasmDtype?: string, _needsWebGPU?: boolean) {
  // "none" = main thread took over, kill everything here
  if (engine === "none") {
    if (mlcEngine) { try { mlcEngine.unload(); } catch {} }
    if (tfEngine) { try { tfEngine.dispose?.(); } catch {} }
    mlcEngine = null; tfEngine = null; activeEngine = null; currentModel = "";
    loadId++;
    return;
  }
  if (currentModel === modelId && activeEngine) {
    post({ type: "status", state: "ready", message: modelId.split("/").pop() });
    return;
  }
  const myId = ++loadId;

  if (mlcEngine) { try { mlcEngine.unload(); } catch {} }
  if (tfEngine) { try { tfEngine.dispose?.(); } catch {} }
  mlcEngine = null; tfEngine = null; activeEngine = null; currentModel = "";

  try {
    if (engine === "webllm") {
      // web-llm needs WebGPU. Check main thread flag since worker might not have navigator.gpu
      if (!webgpuAvailable) throw new Error("WebGPU not available. Try Bonsai 1.7B.");
      try {
        await loadWebLLM(modelId, myId);
      } catch (e: any) {
        // Surface the real error — don't swallow it behind a canned message.
        // Common prod causes: missing COOP/COEP headers (no SharedArrayBuffer),
        // storage quota, ad/tracker blockers, private browsing.
        console.error("[MikroOS] webllm load error:", e);
        const raw = e?.message || String(e);
        const hint =
          raw.match(/cache|caches/i) ? "cache storage unavailable (private mode or blocker?)"
          : raw.match(/quota|storage/i) ? "browser storage quota exceeded"
          : raw.match(/network|fetch|cors/i) ? "network/CORS (model fetch blocked — check extensions)"
          : raw.match(/webgpu|adapter|gpu/i) ? "WebGPU unavailable — try Chrome/Edge desktop"
          : null;
        throw new Error(hint ? `${hint} · ${raw}` : raw);
      }
    } else {
      await loadTransformers(modelId, dtype || "q4", wasmDtype, myId);
    }
  } catch (e: any) {
    if (loadId !== myId) return;
    mlcEngine = null; tfEngine = null; activeEngine = null; currentModel = "";
    const msg = e?.message || String(e);
    console.error("[MikroOS] load failed:", msg);
    post({ type: "error", message: msg.slice(0, 280) });
  }
}

// ── Generate ──

async function generateWebLLM(messages: ChatCompletionMessageParam[]) {
  if (!mlcEngine) return post({ type: "error", message: "Model not loaded." });
  aborted = false;
  post({ type: "status", state: "generating" });
  const stream = await mlcEngine.chat.completions.create({
    messages, stream: true, temperature: temperature || 0, max_tokens: 4096, top_p: 0.9,
  });
  let text = "", inThink = false;
  for await (const chunk of stream) {
    if (aborted) break;
    let delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;
    if (delta.includes("<think>")) inThink = true;
    if (inThink) {
      if (delta.includes("</think>")) { delta = delta.split("</think>").slice(1).join("</think>"); inThink = false; if (!delta) continue; }
      else continue;
    }
    text += delta;
    post({ type: "token", text: delta });
  }
  post({ type: "done", text });
}

async function generateTransformers(messages: Array<{ role: string; content: string }>) {
  if (!tfEngine) return post({ type: "error", message: "Model not loaded." });
  const { TextStreamer, InterruptableStoppingCriteria } = await import("@huggingface/transformers");
  aborted = false;
  const stopping = new InterruptableStoppingCriteria();
  let text = "";
  const streamer = new TextStreamer(tfEngine.tokenizer, {
    skip_prompt: true, skip_special_tokens: true,
    callback_function: (t: string) => { text += t; post({ type: "token", text: t }); },
  });
  post({ type: "status", state: "generating" });
  await tfEngine(messages, {
    max_new_tokens: 4096, do_sample: temperature > 0,
    temperature: temperature || undefined, top_p: 0.9,
    streamer, stopping_criteria: stopping,
  });
  post({ type: "done", text });
}

async function generate(messages: Array<{ role: string; content: string }>) {
  try {
    if (activeEngine === "webllm") await generateWebLLM(messages as ChatCompletionMessageParam[]);
    else if (activeEngine === "transformers") await generateTransformers(messages);
    else post({ type: "error", message: "No model loaded. Please click on SETTINGS to select one." });
  } catch (e: any) {
    if (!aborted) { console.error("[mikro] generate:", e); post({ type: "error", message: e?.message || String(e) }); }
  }
}

self.onmessage = (e: MessageEvent) => {
  const d = e.data;
  if (d.type === "webgpu") webgpuAvailable = d.available;
  else if (d.type === "load") load(d.engine, d.modelId, d.dtype, d.wasmDtype, d.needsWebGPU);
  else if (d.type === "generate") generate(d.messages);
  else if (d.type === "stop") { aborted = true; mlcEngine?.interruptGenerate(); }
  else if (d.type === "temperature") temperature = d.value;
};
