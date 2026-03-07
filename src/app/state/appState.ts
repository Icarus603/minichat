import type { ChatMessage } from '../../shared/chat.js';

export type AppState = {
  sessionId: string;
  transcript: ChatMessage[];
  loading: boolean;
};
