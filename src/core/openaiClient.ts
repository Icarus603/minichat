import type { ChatMessage } from './chatManager.js';
import type { Config } from './configManager.js';
import { getProviderClient } from '../services/llm/providerClient.js';

export async function runBackgroundPrompt(prompt: string, config: Config, signal?: AbortSignal): Promise<string> {
  return await getProviderClient(config).runBackgroundPrompt(prompt, config, signal);
}

export async function chat(messages: ChatMessage[], config: Config, signal?: AbortSignal): Promise<string> {
  return await getProviderClient(config).chat(messages, config, signal);
}
