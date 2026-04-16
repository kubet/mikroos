import { onMount } from "solid-js";
import { store } from "../engine/store";
import { initLLM } from "../engine/llm";
import { initSandbox } from "../engine/sandbox";
import Sidebar from "./components/Sidebar";
import Chat from "./components/Chat";
import StatusBar from "./components/StatusBar";

export default function App() {
  onMount(async () => {
    // Init sandbox (non-blocking)
    initSandbox().catch(console.error);
    // Init LLM worker
    initLLM(store.setLLMStatus);
  });

  return (
    <div class="flex h-full">
      <Sidebar />
      <div class="flex flex-col flex-1 min-w-0">
        <Chat />
        <StatusBar />
      </div>
    </div>
  );
}
