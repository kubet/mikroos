import { For, Show, createSignal } from "solid-js";
import { store } from "../../engine/store";
import { todoStore } from "../../engine/todos";
import { nukeSandbox } from "../../engine/sandbox";
import { loadModel } from "../../engine/llm";
import { MODELS } from "../../engine/models";

export default function Sidebar(props: { onSelect?: () => void }) {
  const [showSettings, setShowSettings] = createSignal(false);
  const [nuking, setNuking] = createSignal(false);

  async function nukeEverything() {
    if (nuking()) return;
    setNuking(true);
    try {
      store.nukeAll();
      todoStore.clear();
      await nukeSandbox();
    } catch (e) { console.error(e); }
    setNuking(false);
  }

  return (
    <div
      class="w-72 flex-shrink-0 bg-c1 flex flex-col h-full"
      style={{ "border-right": "2px solid var(--color-c2)" }}
    >
      {/* Title bar */}
      <div class="flex items-center justify-between px-5 py-4" style={{ "border-bottom": "2px solid var(--color-c2)" }}>
        <div class="flex items-center gap-2">
          <span class="pixel-dot" style={{ background: "var(--color-accent)" }} />
          <span class="font-bold text-xl tracking-wider" style={{ color: "var(--color-c3)" }}>MikroOS</span>
        </div>
        <button
          onClick={() => { store.newThread(); props.onSelect?.(); }}
          class="text-2xl leading-none px-1"
          style={{ color: "var(--color-accent)" }}
          title="New chat"
        >+</button>
      </div>

      {/* Threads */}
      <div class="flex-1 overflow-y-auto">
        <Show when={store.threads.length > 0} fallback={
          <div class="px-5 py-4 text-sm" style={{ color: "color-mix(in srgb, var(--color-c3) 35%, transparent)" }}>
            no threads yet
          </div>
        }>
          <For each={store.threads}>
            {(thread) => {
              const isActive = () => store.activeId() === thread.id;
              return (
                <div
                  class="px-5 py-3 cursor-pointer group flex items-center gap-2"
                  style={{
                    background: isActive() ? "var(--color-c0)" : "transparent",
                    "border-left": isActive() ? "3px solid var(--color-accent)" : "3px solid transparent",
                    color: isActive() ? "var(--color-c3)" : "color-mix(in srgb, var(--color-c3) 70%, transparent)",
                  }}
                  onClick={() => { store.setActiveId(thread.id); props.onSelect?.(); }}
                >
                  <span class="truncate flex-1">{thread.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); store.deleteThread(thread.id); }}
                    class="opacity-0 group-hover:opacity-100 text-sm px-1"
                    style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)" }}
                    title="delete thread"
                  >x</button>
                </div>
              );
            }}
          </For>
        </Show>
      </div>

      {/* Todos */}
      <Show when={todoStore.todos.length > 0}>
        <div class="max-h-48 overflow-y-auto" style={{ "border-top": "2px solid var(--color-c2)" }}>
          <div class="flex items-center justify-between px-5 py-2">
            <span class="text-xs uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)" }}>todos</span>
            <button
              onClick={() => todoStore.clear()}
              class="text-xs uppercase"
              style={{ color: "color-mix(in srgb, var(--color-c3) 40%, transparent)" }}
            >clear</button>
          </div>
          <div class="px-5 pb-2">
            <For each={todoStore.todos}>
              {(todo) => (
                <div class="flex items-start gap-2 py-1 text-sm">
                  <span style={{ color: todo.done ? "color-mix(in srgb, var(--color-c3) 35%, transparent)" : "var(--color-accent)" }}>
                    {todo.done ? "[x]" : "[ ]"}
                  </span>
                  <span style={{
                    color: todo.done ? "color-mix(in srgb, var(--color-c3) 35%, transparent)" : "var(--color-c3)",
                    "text-decoration": todo.done ? "line-through" : "none",
                  }}>{todo.text}</span>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Settings — expanded panel grows upward so toggle stays at bottom */}
      <div>
        <Show when={showSettings()}>
          <div
            class="px-5 py-4 flex flex-col gap-3"
            style={{ "border-top": "2px solid var(--color-c2)" }}
          >
            <div>
              <span class="text-xs uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)" }}>model</span>
              <div class="flex flex-col gap-1 mt-2">
                <For each={MODELS}>
                  {(m) => {
                    const active = () => store.modelId() === m.id;
                    return (
                      <button
                        onClick={() => {
                          if (store.generating()) return;
                          store.setModelId(m.id);
                          loadModel(m.engine, m.modelId, m.dtype, m.wasmDtype, m.needsWebGPU);
                        }}
                        disabled={store.generating()}
                        class="w-full text-left px-3 py-2 text-sm disabled:opacity-30"
                        style={{
                          background: active() ? "var(--color-c0)" : "transparent",
                          "border-left": active() ? "3px solid var(--color-accent)" : "3px solid transparent",
                          color: active() ? "var(--color-c3)" : "color-mix(in srgb, var(--color-c3) 60%, transparent)",
                        }}
                        data-testid={`model-${m.id}`}
                      >
                        <div>{m.name} <span style={{ color: "color-mix(in srgb, var(--color-c3) 40%, transparent)" }}>{m.vram}</span>{m.engine === "transformers" && <span class="ml-1" style={{ color: "color-mix(in srgb, var(--color-c3) 30%, transparent)" }}>onnx</span>}</div>
                      </button>
                    );
                  }}
                </For>
              </div>
            </div>
            <button
              onClick={nukeEverything}
              disabled={nuking()}
              class="pixel-btn pixel-btn-danger"
              data-testid="nuke-all"
            >
              {nuking() ? "nuking..." : "nuke everything"}
            </button>
            <span class="text-xs" style={{ color: "color-mix(in srgb, var(--color-c3) 35%, transparent)" }}>clears threads, todos, sandbox, storage</span>
          </div>
        </Show>

        {/* Repo banner — sits just above settings toggle */}
        <a
          href="https://github.com/kubet/mikroos"
          target="_blank"
          rel="noopener noreferrer"
          class="repo-banner w-full h-10 px-5 flex items-center gap-2 text-xs uppercase tracking-widest"
          style={{
            "border-top": "2px solid var(--color-c2)",
            background: "var(--color-c0)",
            color: "color-mix(in srgb, var(--color-c3) 55%, transparent)",
            "text-decoration": "none",
          }}
          title="view source on github"
        >
          <span style={{ color: "var(--color-accent)" }}>{"</>"}</span>
          <span class="truncate flex-1">github</span>
          <span style={{ color: "color-mix(in srgb, var(--color-c3) 35%, transparent)" }}>↗</span>
        </a>

        <button
          onClick={() => setShowSettings((v) => !v)}
          class="w-full h-10 px-5 text-sm uppercase tracking-widest text-left flex items-center"
          style={{
            color: showSettings() ? "var(--color-accent)" : "color-mix(in srgb, var(--color-c3) 50%, transparent)",
            "border-top": "2px solid var(--color-c2)",
          }}
          data-testid="toggle-settings"
        >
          {showSettings() ? "settings ^" : "settings"}
        </button>
      </div>
    </div>
  );
}
