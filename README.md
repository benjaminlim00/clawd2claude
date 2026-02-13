# clawd2claude

Give your [Clawdbot](https://openclaw.ai/) hands.

Give Clawdbot read-only access to your GitHub repo so it understands your codebase, then point it at this bridge so it can actually do things — run commands, execute tests, search files, modify code — all on your local machine via Claude Code.

## Why not just use GitHub access alone?

GitHub gives Clawdbot **read-only access to committed code**. That's useful for context, but it can't:

- **Run commands.** No tests, builds, git operations, or bash.
- **See your working state.** Uncommitted changes, local branches, untracked files — invisible.
- **Use Claude Code's tooling.** No grep, glob, file search, or web search against your actual directory.

The bridge adds all of this. Clawdbot reads your repo to understand the code, then dispatches work to Claude Code running locally where it has full tool access.

**Security bonus:** env files, secrets, and anything not committed to GitHub never leave your machine. Only Claude Code's response text goes back through the bridge.

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
