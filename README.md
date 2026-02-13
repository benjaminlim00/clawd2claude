# clawd2claude

Give your [Clawdbot](https://openclaw.ai/) hands.

Set up read-only GitHub access so Clawdbot can see your repo, then use a cheap model (like GLM) to orchestrate — spin up subagents that call Claude Code on your local machine through this bridge. The cheap model coordinates and plans; Claude Code does the heavy lifting with full tool access against your live codebase.

**The result:** you get Claude Code's capabilities (file search, grep, bash, tests, builds) orchestrated by a model that costs a fraction of the price. Run many subagents in parallel without burning through expensive tokens on coordination work.

## Why use a bridge instead of just GitHub access?

GitHub repo access gives Clawdbot **eyes** — it can read your committed code. The bridge gives it **hands:**

- **Run commands.** Tests, builds, git operations, arbitrary bash — not just read files.
- **See live state.** Uncommitted changes, local branches, untracked files — not just what's pushed.
- **Full Claude Code tooling.** Grep, glob, file search, web search — all running locally against your actual working directory.
- **No secrets exposed.** Your code and env files stay on your machine. No OAuth grants to third parties.

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
