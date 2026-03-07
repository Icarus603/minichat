# MiniChat

MiniChat is a command-line chatbot for macOS that grows with you.

It remembers your preferences, your ongoing context, and the way you like to be spoken to, so each conversation feels less like starting over and more like returning to someone who already knows you.

It supports:
- `Sign in with ChatGPT`
- `Sign in with Device Code`
- `OpenAI API key`
- `OpenRouter API key`

MiniChat keeps its own state in `~/.minichat/`, remembers your ongoing context through `SOUL.md`, and lets you resume past sessions from the terminal.

## Demo

[![MiniChat demo](https://raw.githubusercontent.com/Icarus603/minichat/f5e867339cb8810b77f5529d7224a608c6d93d16/assets/demo.gif)](https://raw.githubusercontent.com/Icarus603/minichat/f5e867339cb8810b77f5529d7224a608c6d93d16/assets/demo.mov)

Click the preview to open the full demo video: [`assets/demo.mov`](https://raw.githubusercontent.com/Icarus603/minichat/f5e867339cb8810b77f5529d7224a608c6d93d16/assets/demo.mov).

## Platform

MiniChat currently supports **macOS only**.

## Install

### Homebrew cask

Install with:

```bash
brew install --cask Icarus603/tap/minichat
```

Then start MiniChat from any directory:

```bash
minichat
```

Resume a previous conversation:

```bash
minichat --resume
```

### From source

If you are running from the repository:

```bash
bun install
bun run build
./bin/minichat
```

## First Launch

On first launch, MiniChat opens a setup screen. You can choose one of these login methods:

1. `Sign in with ChatGPT`
2. `Sign in with Device Code`
3. `Use OpenAI API key`
4. `Use OpenRouter API key`

If you use `Sign in with ChatGPT` or `Sign in with Device Code`, MiniChat delegates authentication to the official `codex` CLI.

## Requirements

- macOS
- `codex` installed if you want to use ChatGPT or device-code login

## Everyday Use

Start a new chat:

```bash
minichat
```

Open the session picker at startup:

```bash
minichat --resume
```

Inside MiniChat, the most useful commands are:

- `/model` — switch model and, when supported, reasoning effort
- `/new` — start a new conversation
- `/sessions` — browse, resume, rename, or delete saved sessions
- `/login` — clear the current login and return to the login screen
- `/logout` — clear the current login and exit
- `/clear` — clear the current conversation
- `/quit` or `/exit` — leave MiniChat

## Local Files

MiniChat stores its local data under:

```text
~/.minichat/
```

Important files:

- `config.json` — current auth mode, provider, model, and settings
- `auth.json` — imported ChatGPT auth state for Codex-backed use
- `SOUL.md` — MiniChat’s evolving long-term context, preferences, and relationship style
- `transcripts/` — saved chat sessions used by `minichat --resume` and `/sessions`

## Notes

- `OpenAI API key` now uses OpenAI’s newer `Responses API`
- `ChatGPT` / `Device Code` auth still runs through `codex exec`
- `OpenRouter` stays on the OpenAI-compatible `Chat Completions` path for now
