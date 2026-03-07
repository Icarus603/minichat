import type { ChatMessage } from '../../core/chatManager.js';

export type AppState = {
  sessionId: string;
  transcript: ChatMessage[];
  loading: boolean;
};
