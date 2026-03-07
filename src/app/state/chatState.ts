import type { ChatMessage } from '../../core/chatManager.js';

export type ChatState = {
  transcript: ChatMessage[];
  loadingMessage: string | null;
  blinking: boolean;
};
