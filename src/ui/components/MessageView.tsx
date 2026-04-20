import { Show, createMemo, createSignal, onCleanup } from "solid-js";
import { marked } from "marked";
import type { Message } from "../../engine/types";

marked.setOptions({ breaks: true, gfm: true });

const MIME: Record<string, string> = {
  css: "text/css", js: "text/javascript", jsx: "text/javascript",
  json: "application/json", svg: "image/svg+xml", html: "text/html",
};

function getMime(name: string): string {
  const ext = name.split(".").pop() || "";
  return MIME[ext] || "text/plain";
}

function buildPreviewUrl(data: { html: string; files: Record<string, string> }): string {
  let html = data.html;
  const urls: string[] = [];

  for (const [ref, content] of Object.entries(data.files)) {
    const blob = new Blob([content], { type: getMime(ref) });
    const url = URL.createObjectURL(blob);
    urls.push(url);
    html = html.split(ref).join(url);
  }

  const mainBlob = new Blob([html], { type: "text/html" });
  const mainUrl = URL.createObjectURL(mainBlob);
  urls.push(mainUrl);
  return mainUrl;
}

export default function MessageView(props: { message: Message }) {
  const m = () => props.message;
  const html = createMemo(() =>
    m().role === "assistant" && m().content ? marked(m().content) as string : ""
  );

  // Tool result
  if (m().role === "tool") {
    const isPreview = () => m().content.startsWith("__PREVIEW__");
    const toolText = () => isPreview() ? "" : m().content;

    if (isPreview()) {
      const [expanded, setExpanded] = createSignal(true);
      const previewUrl = createMemo(() => {
        try {
          const data = JSON.parse(m().content.slice("__PREVIEW__".length));
          return buildPreviewUrl(data);
        } catch {
          const blob = new Blob([m().content.slice("__PREVIEW__".length)], { type: "text/html" });
          return URL.createObjectURL(blob);
        }
      });

      onCleanup(() => URL.revokeObjectURL(previewUrl()));

      return (
        <div class="px-4 md:px-8 py-2" style={{ background: "var(--color-c0)" }}>
          <button
            onClick={() => setExpanded((v) => !v)}
            class="text-xs uppercase tracking-widest mb-1"
            style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)" }}
          >
            {expanded() ? "preview ^" : "preview v"}
          </button>
          <Show when={expanded()}>
            <div style={{ height: "400px", border: "2px solid var(--color-c2)", background: "white" }}>
              <iframe
                src={previewUrl()}
                sandbox="allow-scripts allow-same-origin"
                style={{ width: "100%", height: "100%", border: "none", background: "white" }}
              />
            </div>
          </Show>
        </div>
      );
    }

    return (
      <Show when={toolText()}>
        <div class="px-4 md:px-8 py-1.5" style={{ background: "var(--color-c0)" }}>
          <pre
            class="whitespace-pre-wrap break-words leading-relaxed"
            style={{ color: "color-mix(in srgb, var(--color-c3) 50%, transparent)", "font-size": "13px" }}
          >{toolText()}</pre>
        </div>
      </Show>
    );
  }

  // User message
  if (m().role === "user") {
    return (
      <div
        class="px-4 md:px-8 py-5 bg-c1"
        style={{ "border-bottom": "1px solid var(--color-c2)", "border-left": "3px solid var(--color-accent)" }}
      >
        <div class="text-xs uppercase tracking-widest mb-2" style={{ color: "color-mix(in srgb, var(--color-c3) 45%, transparent)" }}>
          you
        </div>
        <pre class="whitespace-pre-wrap break-words leading-relaxed">{m().content}</pre>
      </div>
    );
  }

  // Assistant message
  const hasTools = () => !!m().toolCalls?.length;
  return (
    <div
      class="px-4 md:px-8"
      style={{
        background: "var(--color-c0)",
        "padding-top": hasTools() ? "12px" : "20px",
        "padding-bottom": hasTools() ? "6px" : "20px",
        "border-bottom": hasTools() ? "none" : "1px solid var(--color-c2)",
      }}
    >
      <Show when={m().content}>
        <div class="md" innerHTML={html()} />
      </Show>
      <Show when={m().toolCalls?.length}>
        <div class={m().content ? "mt-2" : ""}>
          {m().toolCalls!.map((tc) => (
            <div class="text-sm py-0.5">
              <span style={{ color: "var(--color-accent)" }}>{tc.name}</span>
              <span style={{ color: "color-mix(in srgb, var(--color-c3) 45%, transparent)" }}>(
                {Object.values(tc.args).map(v =>
                  typeof v === "string" ? (v.length > 40 ? v.slice(0, 40) + "..." : v) : String(v)
                ).join(", ")}
              )</span>
            </div>
          ))}
        </div>
      </Show>
    </div>
  );
}
