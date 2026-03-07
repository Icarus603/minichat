import { deleteTranscript, listTranscripts, loadTranscript, renameTranscript, saveTranscript } from '../../core/transcriptManager.js';
import type { ChatMessage } from '../../core/chatManager.js';

export const createSessionId = () => new Date().toISOString().replace(/[:.]/g, '-');

export function createEmptySession(): { sessionId: string; transcript: ChatMessage[] } {
  const sessionId = createSessionId();
  saveTranscript(sessionId, []);
  return { sessionId, transcript: [] };
}

export function loadSession(sessionId: string): ChatMessage[] {
  return loadTranscript(sessionId);
}

export function persistSession(sessionId: string, transcript: ChatMessage[]): void {
  saveTranscript(sessionId, transcript);
}

export function listSessionSummaries() {
  return listTranscripts();
}

export function renameSession(sessionId: string, nextName: string): string | null {
  return renameTranscript(sessionId, nextName);
}

export function deleteSession(sessionId: string): boolean {
  return deleteTranscript(sessionId);
}
