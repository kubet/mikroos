import { For, Show, createSignal } from "solid-js";
import { store } from "../../engine/store";
import { loadModel } from "../../engine/llm";
import { MODELS } from "../../engine/models";

const RECOMMENDED_ID = "qwen-4b";

export default function Setup() {
  const [step, setStep] = createSignal<1 | 2>(1);
  const [selected, setSelected] = createSignal<string>(RECOMMENDED_ID);
  const hasWebGPU = typeof (navigator as any).gpu !== "undefined";

  function start() {
    const m = MODELS.find((x) => x.id === selected());
    if (!m) return;
    store.setModelId(m.id);
    loadModel(m.engine, m.modelId, m.dtype, m.wasmDtype, m.needsWebGPU);
    store.setSetupDone(true);
  }

  function skip() {
    store.setSetupDone(true);
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--color-c0) 92%, transparent)" }}
    >
      <div
        class="w-full max-w-xl"
        style={{
          background: "var(--color-c1)",
          border: "2px solid var(--color-c2)",
        }}
      >
        {/* Title bar */}
        <div
          class="flex items-center justify-between px-5 py-3"
          style={{ "border-bottom": "2px solid var(--color-c2)" }}
        >
          <div class="flex items-center gap-2">
            <span class="pixel-dot" style={{ background: "var(--color-accent)" }} />
            <span class="font-bold tracking-wider" style={{ color: "var(--color-c3)" }}>MikroOS</span>
          </div>
          <div class="text-xs uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--color-c3) 45%, transparent)" }}>
            setup {step()}/2
          </div>
        </div>

        {/* Content */}
        <div class="p-6 md:p-8">
          <Show when={step() === 1}>
            <div class="flex items-center gap-4 mb-4">
              <img
                src="/mascot.png"
                width={192}
                height={128}
                alt=""
                class="shrink-0"
              />
              <div>
                <div
                  style={{
                    "font-size": "40px",
                    "line-height": "1",
                    "letter-spacing": "2px",
                    color: "var(--color-c3)",
                    "font-weight": "bold",
                  }}
                >MikroOS</div>
                <div
                  class="uppercase tracking-widest mt-3"
                  style={{ color: "var(--color-accent)", "font-size": "12px" }}
                >
                  browser-native AI coding agent
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 text-sm leading-relaxed" style={{ color: "color-mix(in srgb, var(--color-c3) 80%, transparent)" }}>
              <p>
                <span style={{ color: "var(--color-accent)" }}>[&gt;]</span>{" "}
                runs a local LLM, a Linux-like sandbox, and a real terminal — all inside your browser.
              </p>
              <p>
                <span style={{ color: "var(--color-accent)" }}>[&gt;]</span>{" "}
                zero servers. zero API keys. your files, threads and memory never leave this tab.
              </p>
              <p>
                <span style={{ color: "var(--color-accent)" }}>[&gt;]</span>{" "}
                the agent can search, edit files, run shell commands and preview html right here.
              </p>
            </div>

            <Show when={!hasWebGPU}>
              <div
                class="mt-5 px-3 py-2 text-xs"
                style={{
                  "border-left": "3px solid var(--color-danger)",
                  color: "var(--color-danger)",
                  background: "var(--color-c0)",
                }}
              >
                heads up: WebGPU not detected. only the Bonsai 1.7B (ONNX/WASM) model will run here. use Chrome / Edge / recent Safari for the Qwen models.
              </div>
            </Show>
          </Show>

          <Show when={step() === 2}>
            <div
              class="uppercase tracking-widest mb-1"
              style={{ color: "var(--color-accent)", "font-size": "12px" }}
            >choose model</div>
            <div class="mb-5 text-sm" style={{ color: "color-mix(in srgb, var(--color-c3) 55%, transparent)" }}>
              larger = smarter but slower to download. runs 100% in your browser.
            </div>

            <div class="flex flex-col gap-2">
              <For each={MODELS}>
                {(m) => {
                  const active = () => selected() === m.id;
                  const recommended = m.id === RECOMMENDED_ID;
                  const disabled = m.needsWebGPU && !hasWebGPU;
                  return (
                    <button
                      onClick={() => !disabled && setSelected(m.id)}
                      disabled={disabled}
                      class="w-full text-left px-4 py-3 flex items-center gap-3"
                      style={{
                        background: active() ? "var(--color-c0)" : "transparent",
                        "border-left": active() ? "3px solid var(--color-accent)" : "3px solid transparent",
                        "border-top": "1px solid var(--color-c2)",
                        "border-bottom": "1px solid var(--color-c2)",
                        "border-right": "1px solid var(--color-c2)",
                        color: disabled ? "color-mix(in srgb, var(--color-c3) 30%, transparent)" : "var(--color-c3)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.5 : 1,
                      }}
                    >
                      <span
                        class="pixel-dot shrink-0"
                        style={{
                          background: active() ? "var(--color-accent)" : "var(--color-c2)",
                        }}
                      />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-bold">{m.name}</span>
                          <Show when={recommended}>
                            <span
                              class="text-xs uppercase tracking-widest px-2 py-0.5"
                              style={{
                                background: "var(--color-accent)",
                                color: "var(--color-c0)",
                                "font-weight": "bold",
                              }}
                            >rec</span>
                          </Show>
                          <Show when={disabled}>
                            <span class="text-xs uppercase" style={{ color: "var(--color-danger)" }}>no WebGPU</span>
                          </Show>
                        </div>
                        <div
                          class="text-xs mt-0.5"
                          style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)" }}
                        >
                          {m.vram} · {m.engine === "transformers" ? "onnx · runs on cpu (wasm)" : "webgpu"}
                        </div>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>

            <div
              class="mt-4 text-xs"
              style={{ color: "color-mix(in srgb, var(--color-c3) 40%, transparent)" }}
            >
              tip: the model downloads once and is cached. next launch is instant.
            </div>
          </Show>
        </div>

        {/* Footer */}
        <div
          class="flex items-center justify-between px-5 py-4 gap-3"
          style={{ "border-top": "2px solid var(--color-c2)", background: "var(--color-c0)" }}
        >
          <Show when={step() === 1} fallback={
            <button
              onClick={() => setStep(1)}
              class="pixel-btn"
            >← back</button>
          }>
            <button
              onClick={skip}
              class="text-xs uppercase tracking-widest"
              style={{ color: "color-mix(in srgb, var(--color-c3) 40%, transparent)" }}
            >skip for now</button>
          </Show>

          <Show when={step() === 1} fallback={
            <button
              onClick={start}
              class="pixel-btn pixel-btn-primary"
            >load model →</button>
          }>
            <button
              onClick={() => setStep(2)}
              class="pixel-btn pixel-btn-primary"
            >get started →</button>
          </Show>
        </div>
      </div>
    </div>
  );
}
