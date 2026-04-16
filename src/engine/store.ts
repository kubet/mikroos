// ── Persistent store for threads/messages ──
import { createSignal, createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";
import type { Thread, Message, LLMStatus } from "./types";

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem("mikro:threads");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveThreads(threads: Thread[]) {
  localStorage.setItem("mikro:threads", JSON.stringify(threads));
}

function createAppStore() {
  const [threads, setThreads] = createStore<Thread[]>(loadThreads());
  const [activeThreadId, setActiveThreadId] = createSignal<string | null>(
    threads.length > 0 ? threads[0].id : null
  );
  const [llmStatus, setLLMStatus] = createSignal<LLMStatus>({ state: "idle" });
  const [isGenerating, setIsGenerating] = createSignal(false);
  const [streamText, setStreamText] = createSignal("");

  function persist() {
    saveThreads([...threads]);
  }

  function createThread(): string {
    const id = uid();
    const thread: Thread = {
      id,
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setThreads(produce((t) => t.unshift(thread)));
    setActiveThreadId(id);
    persist();
    return id;
  }

  function addMessage(threadId: string, msg: Message) {
    setThreads(
      produce((threads) => {
        const t = threads.find((t) => t.id === threadId);
        if (!t) return;
        t.messages.push(msg);
        t.updatedAt = Date.now();
        // Auto-title from first user message
        if (t.title === "New chat" && msg.role === "user") {
          t.title = msg.content.slice(0, 50) + (msg.content.length > 50 ? "..." : "");
        }
      })
    );
    persist();
  }

  function deleteThread(id: string) {
    setThreads(produce((t) => {
      const idx = t.findIndex((x) => x.id === id);
      if (idx >= 0) t.splice(idx, 1);
    }));
    if (activeThreadId() === id) {
      setActiveThreadId(threads.length > 0 ? threads[0].id : null);
    }
    persist();
  }

  function getActiveThread(): Thread | undefined {
    return threads.find((t) => t.id === activeThreadId());
  }

  return {
    threads,
    activeThreadId,
    setActiveThreadId,
    llmStatus,
    setLLMStatus,
    isGenerating,
    setIsGenerating,
    streamText,
    setStreamText,
    createThread,
    addMessage,
    deleteThread,
    getActiveThread,
  };
}

// Singleton store
export const store = createRoot(createAppStore);
