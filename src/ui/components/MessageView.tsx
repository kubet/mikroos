import { Show } from "solid-js";
import type { Message } from "../../engine/types";

function ToolCallBadge(props: { name: string }) {
  return (
    <span class="inline-block px-1.5 py-0.5 bg-accent/10 text-accent text-[10px] rounded mr-1">
      {props.name}
    </span>
  );
}

export default function MessageView(props: { message: Message }) {
  const msg = () => props.message;

  return (
    <div
      class={`px-4 py-3 border-b border-border/30 ${
        msg().role === "user"
          ? "bg-user-bg"
          : msg().role === "tool"
            ? "bg-tool-bg"
            : "bg-agent-bg"
      }`}
    >
      {/* Role label */}
      <div class="text-[10px] text-text-dim mb-1 uppercase tracking-wider">
        {msg().role === "user"
          ? "you"
          : msg().role === "assistant"
            ? "mikro"
            : "tool"}
      </div>

      {/* Content */}
      <Show when={msg().content}>
        <pre class="whitespace-pre-wrap break-words leading-relaxed">
          {msg().content}
        </pre>
      </Show>

      {/* Tool calls */}
      <Show when={msg().toolCalls && msg().toolCalls!.length > 0}>
        <div class="mt-2 flex flex-wrap gap-1">
          {msg().toolCalls!.map((tc) => (
            <ToolCallBadge name={tc.name} />
          ))}
        </div>
      </Show>

      {/* Tool result (collapsed for long outputs) */}
      <Show when={msg().role === "tool" && msg().content.length > 200}>
        <details class="mt-1">
          <summary class="text-[10px] text-text-dim cursor-pointer">
            {msg().content.split("\n").length} lines
          </summary>
        </details>
      </Show>
    </div>
  );
}
