import type { ChatMessage } from '../../shared/chat.js';

export type ChatState = {
  transcript: ChatMessage[];
  loadingMessage: string | null;
  blinking: boolean;
};
