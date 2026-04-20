import { Show } from "solid-js";
import { store } from "../../engine/store";
import { MODELS } from "../../engine/models";

export default function StatusBar(props: { showTerm: boolean; onToggleTerm: () => void }) {
  const state = () => store.llmState();
  const dotColor = () =>
    state() === "ready" ? "var(--color-accent)" :
    state() === "generating" ? "var(--color-accent)" :
    state() === "loading" ? "color-mix(in srgb, var(--color-c3) 45%, transparent)" :
    state() === "error" ? "var(--color-danger)" :
    "color-mix(in srgb, var(--color-c3) 25%, transparent)";

  return (
    <div
      class="h-10 bg-c1 flex items-center px-3 md:px-5 text-sm gap-2 md:gap-4"
      style={{
        "border-top": "2px solid var(--color-c2)",
        color: "color-mix(in srgb, var(--color-c3) 45%, transparent)",
      }}
    >
      <div class="flex items-center gap-2 min-w-0">
        <span
          class={state() === "loading" || state() === "generating" ? "pixel-dot pixel-blink" : "pixel-dot"}
          style={{ background: dotColor() }}
        />
        <span
          class="truncate"
          style={{ color: state() === "error" ? "var(--color-danger)" : undefined }}
          title={state() === "error" ? store.llmMsg() : ""}
        >
          {state() === "ready"
            ? (MODELS.find((m) => m.id === store.modelId())?.name ?? "ready")
            : state() === "loading" ? (store.llmMsg() || "loading...")
            : state() === "error" ? (store.llmMsg().slice(0, 40) || "error")
            : state()}
        </span>
      </div>
      <div class="flex-1" />
      <Show when={store.active()}>
        <span class="hidden md:inline">{store.active()!.messages.length} msgs</span>
      </Show>
      <button
        onClick={() => store.setAutowork((v) => !v)}
        class="shrink-0 text-sm"
        style={{ color: store.autowork() ? "var(--color-accent)" : undefined }}
        title="Toggle autowork"
        data-testid="toggle-autowork"
      >
        auto
      </button>
      <button
        onClick={props.onToggleTerm}
        class="shrink-0 hidden md:inline text-sm"
        style={{ color: props.showTerm ? "var(--color-accent)" : undefined }}
        title="Toggle terminal"
        data-testid="toggle-terminal"
      >
        &gt;_
      </button>
    </div>
  );
}
