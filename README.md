# clawd2claude

Clawdbot can read code, run commands, and search your codebase — but only if it has access to your files. The common workaround is uploading your source code to the Clawdbot server, a bad idea if you care about security...

clawd2claude is a bridge that connects your Clawdbot to a local Claude Code instance. Your code stays on your machine. Clawdbot sends prompts over the bridge, Claude Code does the work locally, and only the response text goes back.

## Why not just put your code on the Clawdbot server?

- **Your proprietary code sits on infrastructure you don't control.** The Clawdbot server is third-party. You're trusting it with your entire codebase.
- **Secrets get exposed.** Env files, API keys, config with credentials — it all goes up with the code. Even if you're careful, one bad `.gitignore` / prompt injection away from a leak.
- **It's stale the moment you upload it.** Every local change means re-uploading. You're always working against an outdated snapshot.

The bridge avoids all of this. Code never leaves your machine. Claude Code reads it live, with full tool access — file search, grep, bash, the works.

## How it works

```
Telegram
  │
  ▼
Clawdbot (server)
  │
  ▼  HTTP POST
ngrok (public URL)
  │
  ▼  tunnel
clawd2claude bridge (your machine, port 8081)
  │
  ▼  spawns CLI
Claude Code (your machine, your code)
```

Clawdbot sends a prompt via its `ccbridge` skill. The request hits your ngrok tunnel, reaches the bridge running on your machine, which spawns `claude` CLI against your local project directory. Claude Code reads files, runs commands, and returns a response. Only that response text travels back up to Clawdbot.

Sessions are tracked per `threadId` so multi-message conversations keep context. One bridge per project.

## Setup

**Prerequisites:** [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated, [ngrok](https://ngrok.com) installed.

```bash
npm install
cp .env.example .env    # edit with your values
npm run build && npm start
```

In a separate terminal, expose it:

```bash
ngrok http 8081
```

Then teach Clawdbot the skill:

1. Copy `skill/ccbridge/SKILL.md` into your Clawdbot's skill directory
2. Set `CLAUDE_BRIDGE_URL` (your ngrok URL) and `CLAUDE_BRIDGE_API_KEY` in Clawdbot's environment

## Configuration

Only `API_KEY` is required. Everything else has defaults. See `.env.example`.

| Variable               | Default                         | Description                                                                                                               |
| ---------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `API_KEY`              | _(required)_                    | Bearer token for authenticating requests                                                                                  |
| `CLAUDE_WORKING_DIR`   | `process.cwd()`                 | Project directory Claude Code operates in                                                                                 |
| `PORT`                 | `8081`                          | Server port                                                                                                               |
| `CLAUDE_ALLOWED_TOOLS` | `Read,Grep,Glob,Bash,WebSearch` | Tools Claude Code can use (comma-separated)                                                                               |
| `CLAUDE_MAX_TURNS`     | `3`                             | Max tool calls per request. Higher = more work per request, more tokens                                                   |
| `CLAUDE_TIMEOUT_MS`    | `180000`                        | Timeout per invocation (ms)                                                                                               |
| `CLAUDE_SYSTEM_PROMPT` | _(empty)_                       | Appended to Claude Code's system prompt. Your project's `CLAUDE.md` is already loaded, so this is for output style tuning |
| `SESSION_TTL_HOURS`    | `4`                             | Hours before a conversation session expires. Lower = cheaper, higher = more continuity                                    |

## API

### `POST /message`

```bash
curl -s -X POST http://localhost:8081/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"prompt": "what files changed in the last commit?", "threadId": "chat-123"}'
```

**Request:** `prompt` (required), `threadId` (optional — same thread = shared conversation context).

**Response:**

```json
{ "result": "...", "threadId": "chat-123", "durationMs": 12345 }
```

### `GET /health`

Returns `{"status": "ok", "uptime": 123}`.
