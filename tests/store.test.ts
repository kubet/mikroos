import { describe, it, expect, beforeEach } from "vitest";
import { createRoot } from "solid-js";

// We test store logic inline since the singleton pattern
// makes it tricky to reset between tests. Test the core operations.

describe("store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("creates and retrieves threads", async () => {
    // Dynamic import to get fresh store after localStorage clear
    // Note: store is a singleton so these tests are cumulative
    const { store } = await import("../src/engine/store");

    const id = store.newThread();
    expect(id).toBeTruthy();
    expect(store.threads.length).toBeGreaterThanOrEqual(1);
    expect(store.activeId()).toBe(id);
  });

  it("adds messages to threads", async () => {
    const { store } = await import("../src/engine/store");

    const id = store.newThread();
    store.addMessage(id, {
      id: "m1", role: "user", content: "hello", timestamp: Date.now(),
    });
    const thread = store.threads.find((t) => t.id === id);
    expect(thread?.messages).toHaveLength(1);
    expect(thread?.messages[0].content).toBe("hello");
  });

  it("auto-titles thread from first user message", async () => {
    const { store } = await import("../src/engine/store");

    const id = store.newThread();
    expect(store.threads.find((t) => t.id === id)?.title).toBe("New chat");
    store.addMessage(id, {
      id: "m2", role: "user", content: "how do I write tests", timestamp: Date.now(),
    });
    expect(store.threads.find((t) => t.id === id)?.title).toContain("how do I write tests");
  });

  it("deletes threads", async () => {
    const { store } = await import("../src/engine/store");

    const id = store.newThread();
    const before = store.threads.length;
    store.deleteThread(id);
    expect(store.threads.length).toBe(before - 1);
  });

  it("persists to localStorage", async () => {
    const { store } = await import("../src/engine/store");

    store.newThread();
    const saved = localStorage.getItem("mikro:threads");
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it("tracks generating state", async () => {
    const { store } = await import("../src/engine/store");

    expect(store.generating()).toBe(false);
    store.setGenerating(true);
    expect(store.generating()).toBe(true);
    store.setGenerating(false);
    expect(store.generating()).toBe(false);
  });

  it("tracks LLM state", async () => {
    const { store } = await import("../src/engine/store");

    expect(store.llmState()).toBe("idle");
    store.setLLMState("loading");
    expect(store.llmState()).toBe("loading");
    store.setLLMState("ready");
    expect(store.llmState()).toBe("ready");
  });
});
