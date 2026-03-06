export type ChatMessage = { role: 'user' | 'ai', content: string };

export function addMessage(msgs: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...msgs, message];
}
