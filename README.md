# clawdbot-ccbridge

HTTP bridge API for invoking [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code). Lets external services (Telegram bots, webhooks, etc.) send prompts to a local Claude Code instance and get responses back.

## How it works

```
Telegram bot → POST /message → bridge → spawns `claude -p "..." --output-format json` → returns result
```

- **Session resume**: Messages with the same `threadId` share a Claude conversation via `--resume`, giving Claude context from previous messages in the thread.
- **Session TTL**: Sessions expire after a configurable window (default 4h) to prevent unbounded token growth from long conversations.
- **Thread serialization**: Messages in the same thread are queued to prevent concurrent `--resume` calls.
- **Concurrency limit**: Max 3 concurrent Claude invocations.

## Setup

Requires [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated.

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm run build
npm start
```

## Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | (required) | Bearer token for authenticating requests |
| `PORT` | `8081` | HTTP server port |
| `CLAUDE_WORKING_DIR` | `cwd` | Working directory for Claude Code |
| `CLAUDE_ALLOWED_TOOLS` | `Read,Grep,Glob,Bash,WebSearch` | Comma-separated tools Claude can use |
| `CLAUDE_MAX_TURNS` | `3` | Max agentic turns per invocation |
| `CLAUDE_TIMEOUT_MS` | `180000` | Timeout per invocation (ms) |
| `CLAUDE_SYSTEM_PROMPT` | (empty) | Appended to Claude's system prompt |
| `SESSION_TTL_HOURS` | `4` | Hours before a session expires |

## Exposing with ngrok

The bridge runs locally, so external services (like a Telegram bot hosted elsewhere) can't reach it directly. Use [ngrok](https://ngrok.com) to create a public URL:

```bash
ngrok http 8081
```

This gives you a URL like `https://abc123.ngrok-free.app` that forwards to your local bridge. Use this as your `CLAUDE_BRIDGE_URL` when configuring the skill.

## Installing the skill

The `skill/ccbridge/` directory contains a skill definition that teaches another Claude instance (e.g. Clawdbot) how to call this bridge. To install it:

1. Copy `skill/ccbridge/SKILL.md` into your Clawdbot's skill directory
2. Set these environment variables in Clawdbot's environment:
   - `CLAUDE_BRIDGE_URL` — the bridge URL (e.g. `https://abc123.ngrok-free.app` or `http://localhost:8081`)
   - `CLAUDE_BRIDGE_API_KEY` — must match the `API_KEY` in your bridge's `.env`
3. Clawdbot will now automatically use the bridge when users ask it to read code, run commands, or interact with the local codebase

## API

### `POST /message`

```bash
curl -s -X POST http://localhost:8081/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"prompt": "read src/index.ts and explain what it does", "threadId": "chat-123"}'
```

**Request body:**
- `prompt` (string, required) — the task or question
- `threadId` (string, optional) — conversation identifier for session resume. Omit to use a default thread.

**Response:**
```json
{
  "result": "The response from Claude Code",
  "threadId": "chat-123",
  "durationMs": 12345
}
```

### `GET /health`

Returns `{"status": "ok", "uptime": 123}`.

## Skill

The `skill/ccbridge/` directory contains a skill definition (SKILL.md) that can be installed into other Claude instances to teach them how to call this bridge.
