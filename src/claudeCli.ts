import { spawn } from "node:child_process";
import type { ClaudeCliResult, ClaudeInvocation } from "./types.js";

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_TURNS = 3;

const invokeClaude = (options: ClaudeInvocation): Promise<ClaudeCliResult> => {
  return new Promise((resolve, reject) => {
    const args: string[] = [
      "-p",
      options.prompt,
      "--output-format",
      "json",
      "--max-turns",
      String(options.maxTurns ?? DEFAULT_MAX_TURNS),
    ];

    if (options.sessionId) {
      args.push("--resume", options.sessionId);
    }

    if (options.allowedTools) {
      args.push("--allowedTools", options.allowedTools);
    }

    if (options.appendSystemPrompt) {
      args.push("--append-system-prompt", options.appendSystemPrompt);
    }

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const child = spawn("claude", args, {
      cwd: options.cwd ?? process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr.trim()}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as ClaudeCliResult;
        resolve(parsed);
      } catch {
        reject(
          new Error(`Failed to parse Claude CLI output: ${stdout.slice(0, 500)}`)
        );
      }
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to spawn claude: ${err.message}`));
    });
  });
};

export { invokeClaude };
