import { createRoot } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { uid } from "./uid";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

function create() {
  const [todos, setTodos] = createStore<Todo[]>([]);

  function add(text: string): string {
    const id = uid();
    setTodos(produce((t) => t.push({ id, text, done: false })));
    return id;
  }

  function done(id: string): boolean {
    let found = false;
    setTodos(produce((t) => {
      const item = t.find((x) => x.id === id);
      if (item) { item.done = true; found = true; }
    }));
    return found;
  }

  function clear() {
    setTodos([]);
  }

  function list(): string {
    if (!todos.length) return "No todos.";
    return todos.map((t, i) => `${i + 1}. [${t.done ? "x" : " "}] ${t.text} (${t.id})`).join("\n");
  }

  function pending(): number {
    return todos.filter((t) => !t.done).length;
  }

  return { todos, add, done, clear, list, pending };
}

export const todoStore = createRoot(create);
