// ── Tool definitions for the agent ──
import type { Tool } from "./types";
import { runCommand, readFile, writeFile, fileExists } from "./sandbox";

export const tools: Tool[] = [
  {
    name: "bash",
    description:
      "Execute a shell command in the sandbox. Has access to common Unix tools (ls, grep, find, cat, sed, awk, etc). Use for running commands, installing things, or any shell operation.",
    parameters: {
      command: { type: "string", description: "The shell command to execute" },
    },
    required: ["command"],
    async execute(args) {
      const { stdout, stderr, exitCode } = await runCommand(
        args.command as string
      );
      let out = "";
      if (stdout) out += stdout;
      if (stderr) out += (out ? "\n" : "") + "STDERR: " + stderr;
      if (exitCode !== 0) out += `\n[exit code: ${exitCode}]`;
      return out || "(no output)";
    },
  },
  {
    name: "read",
    description: "Read the contents of a file at the given path.",
    parameters: {
      path: { type: "string", description: "Absolute file path to read" },
    },
    required: ["path"],
    async execute(args) {
      const path = args.path as string;
      if (!(await fileExists(path))) return `Error: file not found: ${path}`;
      return await readFile(path);
    },
  },
  {
    name: "write",
    description: "Create or overwrite a file with the given content.",
    parameters: {
      path: { type: "string", description: "Absolute file path to write" },
      content: { type: "string", description: "Content to write to the file" },
    },
    required: ["path", "content"],
    async execute(args) {
      await writeFile(args.path as string, args.content as string);
      return `File written: ${args.path}`;
    },
  },
  {
    name: "edit",
    description:
      "Edit a file by replacing an exact string match with new content.",
    parameters: {
      path: { type: "string", description: "Absolute file path to edit" },
      old_string: { type: "string", description: "Exact text to find and replace" },
      new_string: { type: "string", description: "Replacement text" },
    },
    required: ["path", "old_string", "new_string"],
    async execute(args) {
      const path = args.path as string;
      if (!(await fileExists(path))) return `Error: file not found: ${path}`;
      const content = await readFile(path);
      const old_str = args.old_string as string;
      if (!content.includes(old_str))
        return `Error: old_string not found in file`;
      const updated = content.replace(old_str, args.new_string as string);
      await writeFile(path, updated);
      return `File edited: ${path}`;
    },
  },
  {
    name: "grep",
    description:
      "Search file contents using a pattern. Returns matching lines with file paths.",
    parameters: {
      pattern: { type: "string", description: "Search pattern (regex supported)" },
      path: {
        type: "string",
        description: "Directory or file to search in (default: /home/user)",
      },
    },
    required: ["pattern"],
    async execute(args) {
      const path = (args.path as string) || "/home/user";
      const { stdout, stderr } = await runCommand(
        `grep -rn "${(args.pattern as string).replace(/"/g, '\\"')}" ${path}`,
        { timeout: 5000 }
      );
      return stdout || stderr || "No matches found.";
    },
  },
  {
    name: "glob",
    description: "Find files matching a glob pattern.",
    parameters: {
      pattern: {
        type: "string",
        description: 'Glob pattern like "*.js" or "**/*.ts"',
      },
      path: {
        type: "string",
        description: "Directory to search in (default: /home/user)",
      },
    },
    required: ["pattern"],
    async execute(args) {
      const path = (args.path as string) || "/home/user";
      const { stdout } = await runCommand(
        `find ${path} -name "${args.pattern as string}"`,
        { timeout: 5000 }
      );
      return stdout || "No files found.";
    },
  },
  {
    name: "web_search",
    description:
      "Search the web for information. Returns a summary of results. Use when you need current information or facts you don't know.",
    parameters: {
      query: { type: "string", description: "Search query" },
    },
    required: ["query"],
    async execute(args) {
      try {
        const resp = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query as string)}`,
          { headers: { "User-Agent": "mikro/1.0" } }
        );
        const html = await resp.text();
        // Extract result snippets from DDG HTML
        const results: string[] = [];
        const snippetRe = /<a class="result__snippet"[^>]*>(.*?)<\/a>/gs;
        let m;
        while ((m = snippetRe.exec(html)) && results.length < 5) {
          results.push(m[1].replace(/<[^>]+>/g, "").trim());
        }
        return results.length
          ? results.map((r, i) => `${i + 1}. ${r}`).join("\n")
          : "No results found. Try a different query.";
      } catch (e: any) {
        return `Search error: ${e.message}`;
      }
    },
  },
];

export function getToolsForPrompt(): string {
  return tools
    .map(
      (t) =>
        `<tool name="${t.name}">\n${t.description}\nParameters: ${JSON.stringify(t.parameters)}\nRequired: ${JSON.stringify(t.required)}\n</tool>`
    )
    .join("\n\n");
}

export function findTool(name: string): Tool | undefined {
  return tools.find((t) => t.name === name);
}
