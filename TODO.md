# TODO

## Token usage optimization

1. **Summarize instead of resume** — Instead of `--resume` with full history, start a fresh session with a condensed summary of prior context injected into the prompt. Biggest win, most work.
2. **Cap session depth** — Stop resuming after N messages in a thread and start fresh. Already have `SESSION_TTL_HOURS` for time; add a max message count.
3. **System prompt for brevity** — Default `CLAUDE_SYSTEM_PROMPT` to encourage concise responses, targeted file reads (Grep over Read), and minimal tool usage.
4. **Per-request maxTurns** — Let Clawdbot pass a `maxTurns` override in the request body. Default to 2 instead of 3.
5. **Model selection per request** — Accept a `model` field in the request. Use cheaper models (Haiku/Sonnet) for simple read/search tasks, Opus only when needed. CLI supports `--model`.
6. **Truncate tool outputs** — Use system prompt guidance to limit how much Claude Code reads per file.
