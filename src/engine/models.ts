export interface Model {
  id: string;
  name: string;
  engine: "webllm" | "transformers";
  modelId: string;
  dtype?: string;
  wasmDtype?: string; // fallback dtype for WASM (q1 is WebGPU-only)
  vram: string;
  needsWebGPU?: boolean; // true = no WASM fallback possible
}

export const MODELS: Model[] = [
  { id: "bonsai-1.7b", name: "Bonsai 1.7B", engine: "transformers", modelId: "onnx-community/Bonsai-1.7B-ONNX", dtype: "q1", wasmDtype: "q4", vram: "~277 MB" },
  { id: "qwen-0.6b",   name: "Qwen3 0.6B",  engine: "webllm", modelId: "Qwen3-0.6B-q4f16_1-MLC", vram: "~1.4 GB", needsWebGPU: true },
  { id: "qwen-1.7b",   name: "Qwen3 1.7B",  engine: "webllm", modelId: "Qwen3-1.7B-q4f16_1-MLC", vram: "~2 GB", needsWebGPU: true },
  { id: "qwen-4b",     name: "Qwen3 4B",     engine: "webllm", modelId: "Qwen3-4B-q4f16_1-MLC",   vram: "~3.4 GB", needsWebGPU: true },
  { id: "qwen-8b",     name: "Qwen3 8B",     engine: "webllm", modelId: "Qwen3-8B-q4f16_1-MLC",   vram: "~5.7 GB", needsWebGPU: true },
];

export const DEFAULT_MODEL = MODELS[0];
