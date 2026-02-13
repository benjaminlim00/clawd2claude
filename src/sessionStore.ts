import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import type { SessionEntry } from "./types.js";

class SessionStore {
  private sessions: Map<string, SessionEntry>;
  private filePath: string;
  private ttlMs: number;

  constructor(filePath: string, ttlMs: number) {
    this.filePath = filePath;
    this.ttlMs = ttlMs;
    this.sessions = new Map();
    this.load();
  }

  get(threadId: string): string | undefined {
    const entry = this.sessions.get(threadId);
    if (!entry) return undefined;

    if (Date.now() - entry.lastUsed > this.ttlMs) {
      this.sessions.delete(threadId);
      this.persist();
      return undefined;
    }

    return entry.sessionId;
  }

  set(threadId: string, sessionId: string): void {
    const existing = this.sessions.get(threadId);
    this.sessions.set(threadId, {
      sessionId,
      lastUsed: Date.now(),
      createdAt: existing?.createdAt ?? Date.now(),
    });
    this.persist();
  }

  delete(threadId: string): void {
    this.sessions.delete(threadId);
    this.persist();
  }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.sessions) {
      if (now - entry.lastUsed > this.ttlMs) {
        this.sessions.delete(key);
        pruned++;
      }
    }
    if (pruned > 0) this.persist();
    return pruned;
  }

  private load(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, SessionEntry>;
      for (const [key, entry] of Object.entries(parsed)) {
        this.sessions.set(key, entry);
      }
    } catch {
      // Corrupted file — start fresh
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const obj: Record<string, SessionEntry> = {};
    for (const [key, entry] of this.sessions) {
      obj[key] = entry;
    }

    const tmpPath = this.filePath + ".tmp";
    writeFileSync(tmpPath, JSON.stringify(obj, null, 2));
    renameSync(tmpPath, this.filePath);
  }
}

export { SessionStore };
