import { For, Show, createSignal, createEffect } from "solid-js";
import { store } from "../../engine/store";
import { runAgent } from "../../engine/agent";
import { stopGeneration } from "../../engine/llm";
import type { Message } from "../../engine/types";
import MessageView from "./MessageView";

export default function Chat() {
  const [input, setInput] = createSignal("");
  let messagesEnd: HTMLDivElement | undefined;
  let inputRef: HTMLTextAreaElement | undefined;

  const thread = () => store.getActiveThread();
  const messages = () => thread()?.messages ?? [];

  // Auto-scroll on new messages
  createEffect(() => {
    messages().length; // track
    store.streamText(); // track
    messagesEnd?.scrollIntoView({ behavior: "smooth" });
  });

  // Focus input
  createEffect(() => {
    if (!store.isGenerating()) inputRef?.focus();
  });

  async function send() {
    const text = input().trim();
    if (!text || store.isGenerating()) return;

    // Ensure thread exists
    let tid = store.activeThreadId();
    if (!tid) tid = store.createThread();

    // Add user message
    const userMsg: Message = {
      id: Math.random().toString(36).slice(2, 10),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    store.addMessage(tid, userMsg);
    setInput("");
    store.setIsGenerating(true);
    store.setStreamText("");

    try {
      await runAgent(
        text,
        thread()!.messages,
        (msg) => store.addMessage(tid!, msg),
        (token) => store.setStreamText((prev) => prev + token)
      );
    } catch (e: any) {
      store.addMessage(tid, {
        id: Math.random().toString(36).slice(2, 10),
        role: "assistant",
        content: `Error: ${e.message || e}`,
        timestamp: Date.now(),
      });
    }

    store.setIsGenerating(false);
    store.setStreamText("");
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div class="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div class="flex-1 overflow-y-auto">
        <Show
          when={thread()}
          fallback={
            <div class="flex items-center justify-center h-full text-text-dim">
              <div class="text-center">
                <div class="text-accent text-2xl font-bold mb-2">mikro</div>
                <div class="text-xs">browser-native AI coding agent</div>
                <div class="text-xs mt-1 text-text-dim">
                  press + to start a new chat
                </div>
              </div>
            </div>
          }
        >
          <For each={messages()}>
            {(msg) => <MessageView message={msg} />}
          </For>

          {/* Streaming indicator */}
          <Show when={store.isGenerating() && store.streamText()}>
            <div class="px-4 py-3 bg-agent-bg border-b border-border/30">
              <div class="text-[10px] text-text-dim mb-1 uppercase tracking-wider">
                mikro
              </div>
              <pre class="whitespace-pre-wrap break-words leading-relaxed text-text-dim">
                {store.streamText()}
              </pre>
            </div>
          </Show>

          <Show when={store.isGenerating() && !store.streamText()}>
            <div class="px-4 py-3 text-text-dim text-xs animate-pulse">
              thinking...
            </div>
          </Show>

          <div ref={messagesEnd} />
        </Show>
      </div>

      {/* Input */}
      <div class="border-t border-border p-3 bg-surface">
        <div class="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            disabled={store.isGenerating()}
            placeholder={
              store.llmStatus().state === "ready"
                ? "ask mikro anything..."
                : store.llmStatus().state === "loading"
                  ? "loading model..."
                  : "initializing..."
            }
            class="flex-1 bg-surface-2 border border-border rounded px-3 py-2 text-text resize-none outline-none focus:border-accent/50 transition-colors placeholder:text-text-dim/50 min-h-[40px] max-h-[120px]"
            rows={1}
          />
          <Show when={store.isGenerating()}>
            <button
              onClick={() => stopGeneration()}
              class="px-3 py-2 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors text-xs"
            >
              stop
            </button>
          </Show>
          <Show when={!store.isGenerating()}>
            <button
              onClick={send}
              disabled={!input().trim() || store.llmStatus().state !== "ready"}
              class="px-3 py-2 bg-accent/20 text-accent rounded border border-accent/30 hover:bg-accent/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-xs"
            >
              send
            </button>
          </Show>
        </div>
      </div>
    </div>
  );
}
