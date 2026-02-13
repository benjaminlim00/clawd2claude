interface BridgeConfig {
  apiKey: string;
  port: number;
  claudeWorkingDir: string;
  allowedTools: string;
  maxTurns: number;
  claudeTimeoutMs: number;
  systemPrompt: string;
  sessionTtlMs: number;
}

interface ClaudeInvocation {
  prompt: string;
  sessionId?: string;
  maxTurns?: number;
  allowedTools?: string;
  appendSystemPrompt?: string;
  cwd?: string;
  timeoutMs?: number;
}

interface ClaudeCliResult {
  type: "result";
  subtype: string;
  is_error: boolean;
  result: string;
  session_id: string;
  duration_ms: number;
  total_cost_usd: number;
}

interface SessionEntry {
  sessionId: string;
  lastUsed: number;
  createdAt: number;
}

interface MessageRequest {
  prompt: string;
  threadId?: string;
}

interface MessageResponse {
  result: string;
  threadId: string;
  durationMs: number;
}

export type {
  BridgeConfig,
  ClaudeInvocation,
  ClaudeCliResult,
  SessionEntry,
  MessageRequest,
  MessageResponse,
};
