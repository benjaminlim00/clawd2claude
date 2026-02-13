# clawd2claude

Give your [Clawdbot](https://openclaw.ai/) hands.

This bridge lets your [Clawdbot](https://openclaw.ai/) reach into your local machine and control [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — review code, run commands, search the codebase — all from Telegram.

Run one bridge per project to keep each Clawdbot scoped to a single codebase.

## Setup

Requires [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated.

```bash
npm install
cp .env.example .env    # edit with your values
npm run build && npm start
```

Expose it with [ngrok](https://ngrok.com) so Clawdbot can reach it:

```bash
ngrok http 8081
```

Then teach Clawdbot the skill:

1. Copy `skill/ccbridge/SKILL.md` into your Clawdbot's skill directory
2. Set `CLAUDE_BRIDGE_URL` and `CLAUDE_BRIDGE_API_KEY` in Clawdbot's environment

## Configuration (.env)

See `.env.example` for all options.

Only `API_KEY` and `CLAUDE_WORKING_DIR` are required. Everything else has sensible defaults.

| Variable | Description |
|----------|-------------|
| `API_KEY` | Bearer token that callers must include to authenticate |
| `CLAUDE_WORKING_DIR` | The project directory Claude Code operates in |
| `PORT` | Server port (default `8081`) |
| `CLAUDE_ALLOWED_TOOLS` | Comma-separated list of tools Claude Code can use (default `Read,Grep,Glob,Bash,WebSearch`) |
| `CLAUDE_MAX_TURNS` | Max agentic turns per invocation (default `3`). Each turn is one tool call. Higher values let Claude do more work per request but cost more tokens. 3 is enough for most read/search tasks. |
| `CLAUDE_TIMEOUT_MS` | Timeout per invocation in ms (default `180000`) |
| `CLAUDE_SYSTEM_PROMPT` | Appended to Claude Code's system prompt. Claude Code already reads your project's `CLAUDE.md` for context, so this is just for shaping output style. Example: `Keep responses short and use plain text.` |
| `SESSION_TTL_HOURS` | Hours before a conversation resets (default `4`). When Clawdbot sends multiple messages with the same `threadId`, they share a Claude session so it remembers prior context. The TTL controls when that session expires — after that, the next message starts fresh. Lower = cheaper (less context replayed per message), higher = more continuity. |

## API

### `POST /message`

```bash
curl -s -X POST http://localhost:8081/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"prompt": "what files changed in the last commit?", "threadId": "chat-123"}'
```

### `GET /health`

Returns `{"status": "ok"}`.
