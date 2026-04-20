import type { Tool } from "./types";
import { runCommand, readFile, writeFile, fileExists } from "./sandbox";
import { Readability } from "@mozilla/readability";
import { todoStore } from "./todos";

const PROXIES = [
  (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

async function proxiedFetch(url: string): Promise<string> {
  // Try direct first (works for CORS-enabled sites)
  try {
    const direct = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (direct.ok) return direct.text();
  } catch { /* CORS blocked or timeout, try proxies */ }

  // Try proxies in order
  for (const mkUrl of PROXIES) {
    try {
      const resp = await fetch(mkUrl(url), { signal: AbortSignal.timeout(10000) });
      if (resp.ok) {
        const text = await resp.text();
        if (text && text.length > 50) return text;
      }
    } catch { /* try next */ }
  }
  throw new Error("all fetch methods failed");
}

function htmlToText(html: string, url: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = doc.createElement("base");
  base.href = url;
  doc.head.appendChild(base);
  const article = new Readability(doc).parse();
  return article?.textContent?.trim() || doc.body?.textContent?.trim() || "";
}

export const tools: Tool[] = [
  {
    name: "bash",
    params: "command",
    description: "run shell command",
    async execute(a) {
      const { stdout, stderr, exitCode } = await runCommand(a.command as string);
      let out = stdout;
      if (stderr) out += (out ? "\n" : "") + "STDERR: " + stderr;
      if (exitCode !== 0) out += `\n[exit ${exitCode}]`;
      return out || "(no output)";
    },
  },
  {
    name: "read",
    params: "path",
    description: "read file",
    async execute(a) {
      const p = a.path as string;
      if (!(await fileExists(p))) return `Error: not found: ${p}`;
      return readFile(p);
    },
  },
  {
    name: "write",
    params: "path,content",
    description: "write file (auto-creates dirs)",
    async execute(a) {
      const p = a.path as string;
      // Auto-create parent directories
      const dir = p.substring(0, p.lastIndexOf("/"));
      if (dir && dir !== "/workspace") {
        await runCommand(`mkdir -p ${dir}`);
      }
      await writeFile(p, a.content as string);
      return `Written: ${p}`;
    },
  },
  {
    name: "edit",
    params: "path,old_string,new_string",
    description: "replace text in file",
    async execute(a) {
      const p = a.path as string;
      if (!(await fileExists(p))) return `Error: not found: ${p}`;
      const content = await readFile(p);
      const old = a.old_string as string;
      if (!content.includes(old)) return `Error: text not found`;
      await writeFile(p, content.replace(old, a.new_string as string));
      return `Edited: ${p}`;
    },
  },
  {
    name: "grep",
    params: "pattern,path",
    description: "search file contents",
    async execute(a) {
      const p = (a.path as string) || "/workspace";
      const { stdout } = await runCommand(`grep -rn "${(a.pattern as string).replace(/"/g, '\\"')}" ${p}`);
      return stdout || "No matches.";
    },
  },
  {
    name: "search",
    params: "query",
    description: "search skills + web. finds skills first, then google",
    async execute(a) {
      const q = a.query as string;
      const { searchSkills } = await import("./skills");
      const matched = searchSkills(q);
      const parts: string[] = [];
      if (matched.length) {
        parts.push("skills:\n" + matched.map((s) =>
          `  ${s.name} - ${s.description} (open to learn how)`
        ).join("\n"));
      }
      // Also search web
      try {
        const url = "https://www.google.com/search?q=" + encodeURIComponent(q);
        const html = await proxiedFetch(url);
        const doc = new DOMParser().parseFromString(html, "text/html");
        const results: string[] = [];
        doc.querySelectorAll("h3").forEach((h3, i) => {
          if (i >= 5) return;
          const title = h3.textContent?.trim() || "";
          const rawHref = h3.closest("a")?.getAttribute("href") || "";
          let href = rawHref;
          if (rawHref.startsWith("/url?")) {
            const m = rawHref.match(/[?&]q=([^&]+)/);
            href = m ? decodeURIComponent(m[1]) : "";
          }
          if (title) results.push(`${title}${href ? "\n" + href : ""}`);
        });
        if (results.length) parts.push("web:\n" + results.join("\n\n"));
      } catch { /* web search failed, skills only */ }
      return parts.join("\n\n") || "nothing found.";
    },
  },
  {
    name: "open",
    params: "target",
    description: "open a skill (returns instructions to follow) or URL (returns page text)",
    async execute(a) {
      const target = a.target as string;
      // Skill: return its content (instructions) for agent to read + follow
      const { getSkill, skillsList } = await import("./skills");
      const skill = getSkill(target);
      if (skill) return skill.content;
      // URL: fetch and extract text
      if (target.startsWith("http")) {
        try {
          const html = await proxiedFetch(target);
          if (html.includes("<") && html.includes(">")) {
            const text = htmlToText(html, target);
            return text.slice(0, 3000) || "Could not extract text.";
          }
          return html.slice(0, 3000);
        } catch (e: any) {
          return `Fetch error: ${e.message}`;
        }
      }
      return `"${target}" not found. available skills:\n${skillsList()}`;
    },
  },
  {
    name: "preview",
    params: "path",
    description: "preview an HTML file in browser",
    async execute(a) {
      const p = a.path as string;
      if (!(await fileExists(p))) return `Error: not found: ${p}`;
      const html = await readFile(p);
      const dir = p.substring(0, p.lastIndexOf("/"));

      // Collect all local files referenced by the HTML
      const files: Record<string, string> = {};
      const refs = [
        ...html.matchAll(/href=["']([^"']+)["']/gi),
        ...html.matchAll(/src=["']([^"']+)["']/gi),
      ];
      for (const m of refs) {
        const ref = m[1];
        if (ref.startsWith("http") || ref.startsWith("data:") || ref.startsWith("blob:")) continue;
        const fullPath = ref.startsWith("/") ? ref : `${dir}/${ref}`;
        try {
          if (await fileExists(fullPath)) files[ref] = await readFile(fullPath);
        } catch { /* skip */ }
      }

      // Return structured data for UI to create blob URLs
      return `__PREVIEW__${JSON.stringify({ html, files })}`;
    },
  },
  {
    name: "todo",
    params: "action,text",
    description: "task list: add/done/list",
    async execute(a) {
      const action = a.action as string;
      if (action === "add") {
        if (!a.text) return "Error: text required";
        const id = todoStore.add(a.text as string);
        return `Added: ${a.text} (${id})`;
      }
      if (action === "done") {
        if (!a.text) return "Error: id required";
        return todoStore.done(a.text as string) ? `Done: ${a.text}` : `Error: not found`;
      }
      if (action === "list") return todoStore.list();
      return `Error: use add, done, or list`;
    },
  },
  {
    name: "delegate",
    params: "task",
    description: "hand off subtask to fresh agent",
    async execute(a) {
      const { runSubAgent } = await import("./agent");
      return runSubAgent(a.task as string);
    },
  },
];

// Caveman tool spec: minimal tokens
export function toolsPrompt(): string {
  return tools.map((t) => `${t.name}(${t.params}) - ${t.description}`).join("\n");
}

export function findTool(name: string) {
  return tools.find((t) => t.name === name);
}
