export type ChatMessage = { role: 'user' | 'ai' | 'status'; content: string };

export function addMessage(msgs: ChatMessage[], message: ChatMessage): ChatMessage[] {
  return [...msgs, message];
}
