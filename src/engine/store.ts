import { createSignal, createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { Thread, Message, LLMState } from "./types";
import { uid } from "./uid";
import { DEFAULT_MODEL } from "./models";

const load = (): Thread[] => {
  try { return JSON.parse(localStorage.getItem("mikro:threads") || "[]"); }
  catch { return []; }
};

function create() {
  const [threads, setThreads] = createStore<Thread[]>(load());
  const [activeId, setActiveId] = createSignal<string | null>(threads[0]?.id ?? null);
  const [llmState, setLLMState] = createSignal<LLMState>("idle");
  const [llmMsg, setLLMMsg] = createSignal("");
  const [llmProgress, setLLMProgress] = createSignal(0);
  const [generating, setGenerating] = createSignal(false);
  const [stream, setStream] = createSignal("");
  const [autowork, setAutowork] = createSignal(false);
  const [temperature, setTemperature] = createSignal(0.6);
  const [modelId, setModelId] = createSignal(DEFAULT_MODEL.id);
  const [setupDone, _setSetupDone] = createSignal(localStorage.getItem("mikro:setup") === "1");
  const setSetupDone = (v: boolean) => {
    _setSetupDone(v);
    if (v) localStorage.setItem("mikro:setup", "1");
    else localStorage.removeItem("mikro:setup");
  };

  const save = () => localStorage.setItem("mikro:threads", JSON.stringify([...threads]));

  const active = () => threads.find((t) => t.id === activeId());

  function newThread() {
    const id = uid();
    setThreads(produce((t) => t.unshift({ id, title: "New chat", messages: [], createdAt: Date.now() })));
    setActiveId(id);
    save();
    return id;
  }

  function addMessage(threadId: string, msg: Message) {
    setThreads(produce((all) => {
      const t = all.find((x) => x.id === threadId);
      if (!t) return;
      t.messages.push(msg);
      if (t.title === "New chat" && msg.role === "user")
        t.title = msg.content.slice(0, 40) + (msg.content.length > 40 ? "..." : "");
    }));
    save();
  }

  function deleteThread(id: string) {
    setThreads(produce((t) => { const i = t.findIndex((x) => x.id === id); if (i >= 0) t.splice(i, 1); }));
    if (activeId() === id) setActiveId(threads[0]?.id ?? null);
    save();
  }

  function nukeAll() {
    setThreads([]);
    setActiveId(null);
    localStorage.clear();
    _setSetupDone(false);
  }

  return {
    threads, activeId, setActiveId, active,
    llmState, setLLMState, llmMsg, setLLMMsg, llmProgress, setLLMProgress,
    generating, setGenerating, stream, setStream,
    autowork, setAutowork,
    temperature, setTemperature,
    modelId, setModelId,
    setupDone, setSetupDone,
    newThread, addMessage, deleteThread, nukeAll,
  };
}

export const store = createRoot(create);
