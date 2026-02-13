import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { invokeClaude } from "./claudeCli.js";
import { SessionStore } from "./sessionStore.js";
import type { MessageRequest, MessageResponse } from "./types.js";

const MAX_BODY_BYTES = 64 * 1024; // 64 KB
const MAX_CONCURRENT = 3;

const config = loadConfig();

// Init session store
const dataDir = resolve(import.meta.dirname, "..", "data");
const store = new SessionStore(resolve(dataDir, "sessions.json"), config.sessionTtlMs);

// Per-thread promise chain to serialize messages in the same thread
const threadLocks = new Map<string, Promise<void>>();

// Concurrency tracking
let activeRequests = 0;

const readBody = (req: IncomingMessage): Promise<string> => {
  return new Promise((resolve, reject) => {
    let body = "";
    let bytes = 0;
    req.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error("Body too large"));
        return;
      }
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
};

const sendJson = (res: ServerResponse, status: number, data: unknown): void => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

const processThread = async (threadId: string, prompt: string): Promise<MessageResponse> => {
  const sessionId = store.get(threadId);

  try {
    const result = await invokeClaude({
      prompt,
      sessionId,
      maxTurns: config.maxTurns,
      allowedTools: config.allowedTools,
      appendSystemPrompt: config.systemPrompt || undefined,
      cwd: config.claudeWorkingDir,
      timeoutMs: config.claudeTimeoutMs,
    });

    store.set(threadId, result.session_id);

    return {
      result: result.result || "(empty response)",
      threadId,
      durationMs: result.duration_ms,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);

    // Clear session if it looks like a resume error
    if (errMsg.includes("session") || errMsg.includes("resume")) {
      console.log("[Bridge] Clearing expired session");
      store.delete(threadId);
    }

    throw error;
  }
};

const handleMessage = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  // Auth check
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${config.apiKey}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  // Concurrency check
  if (activeRequests >= MAX_CONCURRENT) {
    sendJson(res, 429, { error: `Too many requests (max ${MAX_CONCURRENT} concurrent)` });
    return;
  }

  // Parse body
  let body: MessageRequest;
  try {
    const raw = await readBody(req);
    body = JSON.parse(raw) as MessageRequest;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  if (!body.prompt?.trim()) {
    sendJson(res, 400, { error: "prompt is required" });
    return;
  }

  const threadId = body.threadId ?? "default";
  const prompt = body.prompt.trim();

  // Serialize requests per thread to prevent concurrent --resume calls
  const previousLock = threadLocks.get(threadId) ?? Promise.resolve();

  const currentLock = previousLock.then(() => processThread(threadId, prompt));
  threadLocks.set(threadId, currentLock.then(() => {}, () => {}));

  activeRequests++;
  try {
    console.log(`\n[Bridge] ← Clawdbot asked (thread=${threadId}):\n${prompt}\n`);
    const response = await currentLock;
    console.log(`[Bridge] → Reply (thread=${threadId}, ${response.durationMs}ms):\n${response.result}\n`);
    sendJson(res, 200, response);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`[Bridge] ✗ Error (thread=${threadId}): ${errMsg}`);
    sendJson(res, 500, { error: errMsg.slice(0, 500) });
  } finally {
    activeRequests--;
    // Clean up resolved lock to prevent memory leak
    const lock = threadLocks.get(threadId);
    if (lock) lock.then(() => threadLocks.delete(threadId), () => threadLocks.delete(threadId));
  }
};

// HTTP server
const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { status: "ok", uptime: Math.floor(process.uptime()) });
    return;
  }

  if (req.method === "POST" && req.url === "/message") {
    await handleMessage(req, res);
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(config.port, () => {
  console.log(`[Bridge] Claude Code bridge API running on port ${config.port}`);
  console.log(`[Bridge] Working dir: ${config.claudeWorkingDir}`);
});

// Session cleanup every hour
const pruneInterval = setInterval(() => {
  const pruned = store.prune();
  if (pruned > 0) console.log(`[Bridge] Pruned ${pruned} expired sessions`);
}, 60 * 60 * 1000);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[Bridge] Received ${signal}, shutting down...`);
  clearInterval(pruneInterval);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
