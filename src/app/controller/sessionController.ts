import { deleteTranscript, listTranscripts, loadTranscript, renameTranscript, saveTranscript } from '../../services/storage/transcriptStore.js';
import type { ChatMessage } from '../../shared/chat.js';

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

export function replaceDeletedCurrentSession(): { sessionId: string; transcript: ChatMessage[] } {
  return createEmptySession();
}

export type RewindEntry = {
  transcriptIndex: number;
  preview: string;
};

export function listRewindEntries(transcript: ChatMessage[]): RewindEntry[] {
  return transcript
    .map((message, index) => ({ message, index }))
    .filter(({ message }) => message.role === 'user' && message.content.trim().length > 0)
    .map(({ message, index }) => ({
      transcriptIndex: index,
      preview: message.content.replace(/\s+/g, ' ').trim(),
    }));
}

export function rewindTranscript(transcript: ChatMessage[], transcriptIndex: number): ChatMessage[] {
  const clampedIndex = Math.max(0, Math.min(transcript.length, transcriptIndex));
  return transcript.slice(0, clampedIndex);
}
