import type { ChatMessage } from '../../core/chatManager.js';
import { analyzeContextEvolution, applyContextEvolution } from '../../core/contextEvolution.js';
import { chat } from '../../core/openaiClient.js';
import type { StoredConfig } from '../../services/storage/configStore.js';

export type ChatTurnResult = {
  transcript: ChatMessage[];
};

export async function runChatTurn(
  transcript: ChatMessage[],
  input: string,
  config: StoredConfig,
  signal?: AbortSignal,
): Promise<ChatTurnResult> {
  const userMsg: ChatMessage = { role: 'user', content: input };
  const updated = [...transcript, userMsg];
  const statusMessages: ChatMessage[] = [];
  const planned = await analyzeContextEvolution(updated, config, signal);

  if (planned.soul.length > 0) {
    const applied = applyContextEvolution(planned);
    if (applied.soul.length > 0) {
      statusMessages.push({ role: 'status', content: 'SOUL updated' });
    }
  }

  const response = await chat(updated, config, signal);
  return {
    transcript: [...updated, ...statusMessages, { role: 'ai', content: response }],
  };
}
