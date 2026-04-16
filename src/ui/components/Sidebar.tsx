import { For, Show } from "solid-js";
import { store } from "../../engine/store";

export default function Sidebar() {
  return (
    <div class="w-56 flex-shrink-0 border-r border-border bg-surface flex flex-col h-full">
      {/* Header */}
      <div class="p-3 border-b border-border flex items-center justify-between">
        <span class="text-accent font-bold text-sm tracking-wider">mikro</span>
        <button
          onClick={() => store.createThread()}
          class="text-text-dim hover:text-accent transition-colors text-lg leading-none"
          title="New chat"
        >
          +
        </button>
      </div>

      {/* Thread list */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={store.threads.length > 0}
          fallback={
            <div class="p-3 text-text-dim text-xs">No threads yet</div>
          }
        >
          <For each={store.threads}>
            {(thread) => (
              <div
                class={`px-3 py-2 cursor-pointer border-b border-border/50 hover:bg-surface-2 transition-colors group flex items-center justify-between ${
                  store.activeThreadId() === thread.id ? "bg-surface-2" : ""
                }`}
                onClick={() => store.setActiveThreadId(thread.id)}
              >
                <span class="truncate text-xs flex-1">{thread.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    store.deleteThread(thread.id);
                  }}
                  class="text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100 ml-2 text-xs"
                >
                  x
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>

      {/* Footer */}
      <div class="p-2 border-t border-border text-[10px] text-text-dim text-center">
        all local. all browser.
      </div>
    </div>
  );
}
