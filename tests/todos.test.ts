import { describe, it, expect, beforeEach } from "vitest";
import { todoStore } from "../src/engine/todos";

describe("todoStore", () => {
  beforeEach(() => {
    todoStore.clear();
  });

  it("adds a todo", () => {
    const id = todoStore.add("write tests");
    expect(id).toBeTruthy();
    expect(todoStore.todos.length).toBe(1);
    expect(todoStore.todos[0].text).toBe("write tests");
    expect(todoStore.todos[0].done).toBe(false);
  });

  it("marks a todo done", () => {
    const id = todoStore.add("do thing");
    expect(todoStore.done(id)).toBe(true);
    expect(todoStore.todos[0].done).toBe(true);
  });

  it("returns false for unknown id", () => {
    expect(todoStore.done("fake")).toBe(false);
  });

  it("lists todos", () => {
    todoStore.add("first");
    todoStore.add("second");
    const list = todoStore.list();
    expect(list).toContain("first");
    expect(list).toContain("second");
    expect(list).toContain("[ ]");
  });

  it("lists done todos with [x]", () => {
    const id = todoStore.add("done task");
    todoStore.done(id);
    expect(todoStore.list()).toContain("[x]");
  });

  it("counts pending", () => {
    todoStore.add("a");
    const id = todoStore.add("b");
    todoStore.add("c");
    todoStore.done(id);
    expect(todoStore.pending()).toBe(2);
  });

  it("clears all", () => {
    todoStore.add("a");
    todoStore.add("b");
    todoStore.clear();
    expect(todoStore.todos.length).toBe(0);
    expect(todoStore.list()).toBe("No todos.");
  });
});
