import { Show } from "solid-js";
import { store } from "../../engine/store";

export default function StatusBar() {
  const status = () => store.llmStatus();

  return (
    <div class="h-6 border-t border-border bg-surface flex items-center px-3 text-[10px] text-text-dim gap-3">
      {/* LLM status */}
      <div class="flex items-center gap-1.5">
        <div
          class={`w-1.5 h-1.5 rounded-full ${
            status().state === "ready"
              ? "bg-accent"
              : status().state === "loading"
                ? "bg-yellow-400 animate-pulse"
                : status().state === "generating"
                  ? "bg-blue-400 animate-pulse"
                  : status().state === "error"
                    ? "bg-red-400"
                    : "bg-text-dim"
          }`}
        />
        <span>
          {status().state === "ready"
            ? "bonsai 1.7B ready"
            : status().state === "loading"
              ? status().message || "loading..."
              : status().state === "generating"
                ? "generating..."
                : status().state === "error"
                  ? `error: ${status().message}`
                  : "idle"}
        </span>
        <Show when={status().progress != null}>
          <span>{status().progress}%</span>
        </Show>
      </div>

      <div class="flex-1" />

      {/* Thread info */}
      <Show when={store.getActiveThread()}>
        <span>{store.getActiveThread()!.messages.length} messages</span>
      </Show>

      <span>webgpu + lifo-sh</span>
    </div>
  );
}
