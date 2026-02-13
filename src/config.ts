import type { BridgeConfig } from "./types.js";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
};

const loadConfig = (): BridgeConfig => {
  const sessionTtlHours = parseInt(process.env.SESSION_TTL_HOURS ?? "4", 10);

  return {
    apiKey: requireEnv("API_KEY"),
    port: parseInt(process.env.PORT ?? "8081", 10),
    claudeWorkingDir: process.env.CLAUDE_WORKING_DIR ?? process.cwd(),
    allowedTools: process.env.CLAUDE_ALLOWED_TOOLS ?? "Read,Grep,Glob,Bash,WebSearch",
    maxTurns: parseInt(process.env.CLAUDE_MAX_TURNS ?? "3", 10),
    claudeTimeoutMs: parseInt(process.env.CLAUDE_TIMEOUT_MS ?? "180000", 10),
    systemPrompt: process.env.CLAUDE_SYSTEM_PROMPT ?? "",
    sessionTtlMs: sessionTtlHours * 60 * 60 * 1000,
  };
};

export { loadConfig };
