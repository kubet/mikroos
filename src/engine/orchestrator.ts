// Orchestrator: autowork mode. Runs the agent, then verifies work was done.
// No hardcoded skill matching — the agent uses search/open tools itself.

import type { Message } from "./types";
import { uid } from "./uid";
import { runAgent } from "./agent";
import { runCommand } from "./sandbox";

export type OnMessage = (msg: Message) => void;
export type OnReset = () => void;

async function getFiles(): Promise<string[]> {
  const { stdout } = await runCommand("find /workspace -type f -not -name README.md", 5000);
  return stdout.trim().split("\n").filter(Boolean);
}

export async function orchestrate(
  task: string,
  _threadId: string,
  onMessage: OnMessage,
  onToken: (t: string) => void,
  onReset: OnReset,
): Promise<boolean> {
  const filesBefore = await getFiles();

  // Run the agent normally — it will search skills, open them, write files
  await runAgent(task, [], onMessage, onToken, onReset);

  // Verify: did files get created?
  const filesAfter = await getFiles();
  const newFiles = filesAfter.filter((f) => !filesBefore.includes(f));

  if (newFiles.length === 0) {
    // Agent didn't create files. Try once more with explicit nudge.
    onMessage({ id: uid(), role: "assistant", content: "no files created. retrying...", timestamp: Date.now() });
    onReset();
    await runAgent(
      `${task}\nIMPORTANT: you must write files to /workspace. search for a skill, open it, then write the files.`,
      [], onMessage, onToken, onReset,
    );

    const filesRetry = await getFiles();
    const retryNew = filesRetry.filter((f) => !filesBefore.includes(f));

    if (retryNew.length === 0) {
      onMessage({ id: uid(), role: "assistant", content: "failed — no files created.", timestamp: Date.now() });
      return true;
    }
  }

  // Final verification
  onReset();
  const { stdout } = await runCommand("ls -la /workspace");
  const allNew = (await getFiles()).filter((f) => !filesBefore.includes(f));

  onMessage({ id: uid(), role: "tool", content: stdout, timestamp: Date.now() });
  onMessage({
    id: uid(), role: "assistant",
    content: `done. ${allNew.length} files: ${allNew.map((f) => f.replace("/workspace/", "")).join(", ")}`,
    timestamp: Date.now(),
  });

  return true;
}
