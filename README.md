# MiniChat

MiniChat is a terminal chatbot built with Ink, React, and Bun.

It uses OpenAI models, supports ChatGPT sign-in through the official `codex login` flow, and keeps its own local app state under `~/.minichat/`.

## Features

- ChatGPT login flow backed by the official Codex CLI
- Fallback manual API key setup
- Persistent local config, memory, and persona files in `~/.minichat/`
- Rich terminal UI with multiline input, cursor movement, slash commands, and markdown rendering
- Fullscreen-aware rendering fixes for terminal resize transitions

## Requirements

- Bun
- Node.js
- `codex` installed if you want to use `Sign in with ChatGPT` or `Sign in with Device Code`

## Install

```bash
bun install
bun run build
```

## Run

```bash
node dist/cli.js
```

or:

```bash
./bin/minichat
```

On first launch, MiniChat opens a setup screen with three options:

1. `Sign in with ChatGPT`
2. `Sign in with Device Code`
3. `Provide your own API key`

For ChatGPT-based login, MiniChat delegates authentication to the official Codex CLI, then stores its own usable local state in `~/.minichat/`.

## Local Files

MiniChat stores its app data here:

```text
~/.minichat/
```

Important files:

- `config.json`: active model and auth mode
- `auth.json`: imported ChatGPT auth state for Codex-backed chatting
- `SOUL.md`: default personality / tone
- `MEMORY.md`: persistent personal notes

## Commands

- `/clear`: clear the current transcript
- `/quit`
- `/exit`

## Development

```bash
bun run build
node dist/cli.js
```

This repo currently commits `dist/` output on purpose, so rebuild after source changes before committing.
