import { onMount } from "solid-js";
import { setTerminal, initSandbox } from "../../engine/sandbox";

// Warm dark terminal with amber accent
const THEME = {
  background: "#1c1917",
  foreground: "#c8c2ba",
  cursor: "#e8913a",
  cursorAccent: "#1c1917",
  selectionBackground: "#35313080",
  black: "#1c1917",
  white: "#c8c2ba",
  brightBlack: "#5a5450",
  brightWhite: "#e0dbd5",
  red: "#c64d3a",
  green: "#8a9a5b",
  yellow: "#e8913a",
  blue: "#6a8caa",
  magenta: "#a87373",
  cyan: "#6ba89a",
  brightRed: "#d86655",
  brightGreen: "#9eae6e",
  brightYellow: "#f0a350",
  brightBlue: "#85a3bf",
  brightMagenta: "#bf8a8a",
  brightCyan: "#80bdae",
};

export default function TerminalPanel() {
  let container: HTMLDivElement | undefined;

  onMount(async () => {
    if (!container) return;
    const { Terminal } = await import("@lifo-sh/ui");
    const term = new Terminal(container);
    (term as any).xterm.options.theme = THEME;
    (term as any).xterm.options.fontFamily = "'Monocraft', monospace";
    (term as any).xterm.options.fontSize = 16;
    (term as any).xterm.options.lineHeight = 1.3;
    (term as any).fitAddon.fit();
    setTerminal(term);
    initSandbox().catch(console.error);
  });

  return (
    <div
      ref={container}
      class="h-full w-full"
      style={{ "min-height": "280px", background: "var(--color-c0)" }}
      data-testid="terminal"
    />
  );
}
