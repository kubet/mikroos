import { onMount, createSignal, Show } from "solid-js";
import { store } from "../engine/store";
import { initLLM } from "../engine/llm";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import StatusBar from "./components/StatusBar";
import TerminalPanel from "./components/Terminal";
import Setup from "./components/Setup";

export default function App() {
  const [showTerm, setShowTerm] = createSignal(false);
  const [showSidebar, setShowSidebar] = createSignal(false);

  onMount(() => {
    initLLM((state, message, progress) => {
      store.setLLMState(state);
      store.setLLMMsg(message ?? "");
      store.setLLMProgress(progress ?? 0);
    });
    // No auto-load. User picks model in settings.
  });

  return (
    <div class="flex h-full relative">
      {/* Sidebar: fixed on desktop, overlay on mobile */}
      <div
        class={`${showSidebar() ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-30 h-full transition-transform duration-200`}
      >
        <Sidebar onSelect={() => setShowSidebar(false)} />
      </div>

      {/* Overlay backdrop on mobile */}
      {showSidebar() && (
        <div class="fixed inset-0 bg-black/40 z-20 md:hidden" onClick={() => setShowSidebar(false)} />
      )}

      <div class="flex flex-col flex-1 min-w-0 min-h-0">
        <div class="flex-1 min-h-0 flex flex-col">
          <div class="flex-1 min-h-0 flex flex-col">
            <Chat onMenu={() => setShowSidebar((v) => !v)} />
          </div>
          <div
            class="flex-shrink-0"
            style={{
              height: showTerm() ? "280px" : "0px",
              overflow: "hidden",
              "border-top": showTerm() ? "2px solid var(--color-c2)" : "none",
            }}
            data-testid="terminal-wrapper"
          >
            <TerminalPanel />
          </div>
        </div>
        <StatusBar showTerm={showTerm()} onToggleTerm={() => setShowTerm((v) => !v)} />
      </div>

      <Show when={!store.setupDone()}>
        <Setup />
      </Show>
    </div>
  );
}
