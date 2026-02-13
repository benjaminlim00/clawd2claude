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

| Variable | Default | Description |
|----------|---------|-------------|
| `API_KEY` | (required) | Bearer token for requests |
| `PORT` | `8081` | Server port |
| `CLAUDE_WORKING_DIR` | `cwd` | Working directory for Claude Code |
| `CLAUDE_ALLOWED_TOOLS` | `Read,Grep,Glob,Bash,WebSearch` | Tools Claude Code can use |
| `CLAUDE_MAX_TURNS` | `3` | Max turns per invocation |
| `CLAUDE_TIMEOUT_MS` | `180000` | Timeout (ms) |
| `CLAUDE_SYSTEM_PROMPT` | (empty) | Appended to system prompt |
| `SESSION_TTL_HOURS` | `4` | Session expiry |

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
