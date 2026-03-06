import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import type { ChatMessage } from './chatManager.js';
import type { Config } from './configManager.js';
import { configDir } from './configManager.js';
import { chatWithCodexAuth, hasMinichatCodexAuth } from './codexAuth.js';

function readFile(name: string): string {
  try {
    return fs.readFileSync(path.join(configDir, name), 'utf-8').trim();
  } catch {
    return '';
  }
}

function buildSystemPrompt(): string {
  const soul   = readFile('SOUL.md');
  const memory = readFile('MEMORY.md');
  const parts  = [soul, memory].filter(Boolean);
  return parts.join('\n\n---\n\n');
}

export async function chat(messages: ChatMessage[], config: Config): Promise<string> {
  const system = buildSystemPrompt();
  const systemMessages: { role: 'system'; content: string }[] =
    system ? [{ role: 'system', content: system }] : [];

  if (!config.apiKey) {
    if (!hasMinichatCodexAuth()) {
      throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
    }

    return await chatWithCodexAuth(messages, config.model, system);
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      ...systemMessages,
      ...messages.map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      })),
    ],
  });

  return response.choices[0]?.message?.content ?? '(no response)';
}
