---
name: ccbridge
description: Connect to a local Claude Code instance via HTTP bridge API. Use this when you need to read code, run commands, search codebases, or perform development tasks on the user's local machine.
metadata: {"openclaw":{"requires":{"env":["CLAUDE_BRIDGE_URL","CLAUDE_BRIDGE_API_KEY"],"bins":["curl"]},"primaryEnv":"CLAUDE_BRIDGE_API_KEY"}}
---

# Claude Code Bridge

You have access to a Claude Code instance running on the user's local machine via an HTTP bridge API.

## When to use this skill

- The user asks you to read, search, or modify code on their machine
- The user asks about their codebase, project structure, or files
- The user needs you to run commands, tests, or builds locally
- The user asks you to debug, analyze, or explain code in their repo
- Any task that requires access to the user's local development environment

## How to call the bridge

Make an HTTP request using curl:

```bash
curl -s -X POST "$CLAUDE_BRIDGE_URL/message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CLAUDE_BRIDGE_API_KEY" \
  -d '{"prompt": "<YOUR_PROMPT_HERE>", "threadId": "<THREAD_ID>"}'
```

### Request fields

- `prompt` (required): The task or question for Claude Code. Be specific — include file paths, function names, or exact instructions.
- `threadId` (optional): A conversation identifier. Use the same threadId across related messages to maintain context (Claude Code will remember previous messages in the same thread). Use a new threadId to start a fresh conversation.

### Response format

```json
{
  "result": "The response text from Claude Code",
  "threadId": "the-thread-id-used",
  "durationMs": 12345
}
```

On error, the response will have a non-200 status code:

```json
{
  "error": "Error description"
}
```

## Guidelines

- Use a consistent `threadId` (e.g. the Telegram chat ID or user ID) so Claude Code maintains conversation context across multiple requests.
- The bridge may take 30 seconds to 3 minutes to respond depending on the task complexity. This is normal.
- If you get a 500 error mentioning "session" or "resume", the conversation context expired. Just retry without a threadId or use a new one.
- Be specific in your prompts. Instead of "look at the code", say "read src/index.ts and explain the main server setup".
- You can ask Claude Code to run commands, read files, search code, and more — it has full access to the user's local machine and tools.

## Health check

To verify the bridge is running:

```bash
curl -s "$CLAUDE_BRIDGE_URL/health"
```

Returns `{"status":"ok","uptime":123}` if the bridge is up.
