import type { ChatMessage } from '../../shared/chat.js';
import type { StoredConfig } from '../storage/configStore.js';
import { getProviderClient } from './providerClient.js';

export async function chat(
  messages: ChatMessage[],
  config: StoredConfig,
  signal?: AbortSignal,
): Promise<string> {
  return await getProviderClient(config).chat(messages, config, signal);
}

export async function runBackgroundPrompt(
  prompt: string,
  config: StoredConfig,
  signal?: AbortSignal,
): Promise<string> {
  return await getProviderClient(config).runBackgroundPrompt(prompt, config, signal);
}
