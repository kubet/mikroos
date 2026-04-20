import { For, Show, createSignal, createEffect, createMemo } from "solid-js";
import { marked } from "marked";
import { store } from "../../engine/store";
import { runAgent } from "../../engine/agent";
import { orchestrate } from "../../engine/orchestrator";
import { stopGeneration } from "../../engine/llm";
import { uid } from "../../engine/uid";
import MessageView from "./MessageView";

marked.setOptions({ breaks: true, gfm: true });

function cleanStream(text: string): string {
  let clean = text;
  const re = /\{\s*"tool"\s*:[^}]*(?:\{[^}]*\}[^}]*)?\}/g;
  clean = clean.replace(re, "");
  clean = clean.replace(/\{\s*"tool"\s*:[^}]*$/s, "");
  clean = clean.replace(/\{\s*"name"\s*:[^}]*(?:\{[^}]*\}[^}]*)?\}/g, "");
  clean = clean.replace(/\{\s*"name"\s*:[^}]*$/s, "");
  return clean.trim();
}

export default function Chat(props: { onMenu?: () => void }) {
  const [input, setInput] = createSignal("");
  let bottom: HTMLDivElement | undefined;
  let textarea: HTMLTextAreaElement | undefined;

  const msgs = () => store.active()?.messages ?? [];

  const streamHtml = createMemo(() => {
    const raw = store.stream();
    if (!raw) return "";
    const clean = cleanStream(raw);
    if (!clean) return "";
    return marked(clean) as string;
  });

  createEffect(() => { msgs().length; store.stream(); bottom?.scrollIntoView({ behavior: "smooth" }); });
  createEffect(() => { if (!store.generating()) textarea?.focus(); });

  async function send() {
    const text = input().trim();
    if (!text || store.generating()) return;

    let tid = store.activeId() ?? store.newThread();
    const historyBefore = [...(store.active()?.messages ?? [])];
    store.addMessage(tid, { id: uid(), role: "user", content: text, timestamp: Date.now() });
    setInput("");
    store.setGenerating(true);
    store.setStream("");

    try {
      let handled = false;
      if (store.autowork()) {
        handled = await orchestrate(
          text, tid,
          (msg) => store.addMessage(tid, msg),
          (t) => store.setStream((s) => s + t),
          () => store.setStream(""),
        );
      }
      if (!handled) {
        await runAgent(
          text,
          historyBefore,
          (msg) => store.addMessage(tid, msg),
          (t) => store.setStream((s) => s + t),
          () => store.setStream(""),
        );
      }
    } catch (e: any) {
      store.addMessage(tid, { id: uid(), role: "assistant", content: `Error: ${e.message || e}`, timestamp: Date.now() });
    }
    store.setGenerating(false);
    store.setStream("");
  }

  return (
    <div class="flex flex-col flex-1 min-h-0">
      {/* Mobile header */}
      <div class="md:hidden flex items-center gap-3 px-4 py-3 bg-c1" style={{ "border-bottom": "2px solid var(--color-c2)" }}>
        <button
          onClick={props.onMenu}
          class="text-xl leading-none"
          style={{ color: "var(--color-accent)" }}
        >///</button>
        <span class="font-bold tracking-wider">MikroOS</span>
      </div>

      <div class="flex-1 min-h-0 overflow-y-auto" style={{ background: "var(--color-c0)" }}>
        <Show when={store.active()} fallback={
          <div class="flex items-center justify-center h-full text-center">
            <div style={{ padding: "24px" }}>
              <img
                src="/mascot.png"
                width={480}
                height={320}
                alt=""
                style={{ margin: "0 auto 16px", display: "block" }}
              />
              <div
                style={{
                  "font-size": "48px",
                  "line-height": "1",
                  "letter-spacing": "3px",
                  color: "var(--color-c3)",
                  "font-weight": "bold",
                }}
              >
                MikroOS
              </div>
              <div
                class="uppercase tracking-widest"
                style={{ "margin-top": "14px", color: "var(--color-accent)", "font-size": "13px" }}
              >
                browser-native AI coding agent
              </div>
              <div
                style={{
                  "margin-top": "28px",
                  color: "color-mix(in srgb, var(--color-c3) 35%, transparent)",
                  "font-size": "12px",
                }}
              >
                press [+] or type below to begin
              </div>
            </div>
          </div>
        }>
          <For each={msgs()}>{(msg) => <MessageView message={msg} />}</For>

          <Show when={store.generating() && store.stream()}>
            <div
              class="px-4 md:px-8 py-4 md:py-5"
              style={{ background: "var(--color-c0)", "border-bottom": "1px solid var(--color-c2)" }}
            >
              <Show when={streamHtml()} fallback={
                <pre
                  class="whitespace-pre-wrap break-words leading-relaxed"
                  style={{ color: "color-mix(in srgb, var(--color-c3) 30%, transparent)", "font-size": "14px" }}
                >{store.stream()}</pre>
              }>
                <div class="md" innerHTML={streamHtml()} />
              </Show>
            </div>
          </Show>

          <Show when={store.generating() && !store.stream()}>
            <div
              class="px-4 md:px-8 py-4 md:py-5"
              style={{ color: "color-mix(in srgb, var(--color-c3) 45%, transparent)" }}
            >
              <span class="pixel-blink">●</span> thinking<span class="pixel-blink">...</span>
            </div>
          </Show>

          <div ref={bottom} />
        </Show>
      </div>

      {/* Input */}
      <div class="p-3 md:p-5 bg-c1" style={{ "border-top": "2px solid var(--color-c2)" }}>
        <div class="flex gap-2 md:gap-3 items-stretch">
          <textarea
            ref={textarea}
            data-testid="chat-input"
            value={input()}
            onInput={(e) => setInput(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={store.generating()}
            placeholder={store.llmState() === "ready" ? "ask MikroOS..." : "loading model..."}
            class="flex-1 pixel-input"
            style={{ "min-height": "48px", "max-height": "180px" }}
            rows={1}
          />
          <Show when={store.generating()} fallback={
            <button
              onClick={send}
              disabled={!input().trim() || store.llmState() !== "ready"}
              class="pixel-btn pixel-btn-primary shrink-0"
              style={{ "min-width": "84px" }}
            >send</button>
          }>
            <button
              onClick={() => stopGeneration()}
              class="pixel-btn pixel-btn-danger shrink-0"
              style={{ "min-width": "84px" }}
            >stop</button>
          </Show>
        </div>
      </div>
    </div>
  );
}
