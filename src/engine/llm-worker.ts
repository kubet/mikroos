// ── Web Worker for LLM inference ──
// Runs Bonsai 1-bit model via @huggingface/transformers on WebGPU

import {
  pipeline,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

const MODEL_ID = "onnx-community/Bonsai-1.7B-ONNX";

let generator: any = null;
let stopping = new InterruptableStoppingCriteria();

type Msg = { type: string; [k: string]: any };

function post(msg: Msg) {
  self.postMessage(msg);
}

async function loadModel() {
  post({ type: "status", state: "loading", message: "Downloading model..." });

  generator = await pipeline("text-generation", MODEL_ID, {
    device: "webgpu",
    dtype: "q1" as any,
    progress_callback: (p: any) => {
      if (p.status === "progress" && p.total) {
        post({
          type: "status",
          state: "loading",
          progress: Math.round((p.loaded / p.total) * 100),
          message: `Downloading: ${p.file}`,
        });
      }
    },
  });

  // Warmup pass - compiles WebGPU shaders
  post({ type: "status", state: "loading", message: "Warming up WebGPU..." });
  const warmup = generator.tokenizer("x");
  await generator.model.generate({ ...warmup, max_new_tokens: 1 });

  post({ type: "status", state: "ready", message: "Ready" });
}

async function generate(messages: Array<{ role: string; content: string }>) {
  if (!generator) {
    post({ type: "error", message: "Model not loaded" });
    return;
  }

  stopping = new InterruptableStoppingCriteria();
  let fullText = "";

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (token: string) => {
      fullText += token;
      post({ type: "token", text: token });
    },
  });

  try {
    post({ type: "status", state: "generating" });
    await generator(messages, {
      max_new_tokens: 2048,
      do_sample: false,
      streamer,
      stopping_criteria: stopping,
    });
    post({ type: "done", text: fullText });
  } catch (e: any) {
    post({ type: "error", message: e.message });
  }
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const { type } = e.data;
  if (type === "load") await loadModel();
  else if (type === "generate") await generate(e.data.messages);
  else if (type === "stop") stopping.interrupt();
};
