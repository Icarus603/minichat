import { deleteTranscript, listTranscripts, loadTranscript, renameTranscript, saveTranscript } from '../../services/storage/transcriptStore.js';
export const createSessionId = () => new Date().toISOString().replace(/[:.]/g, '-');
export function createEmptySession() {
    const sessionId = createSessionId();
    saveTranscript(sessionId, []);
    return { sessionId, transcript: [] };
}
export function loadSession(sessionId) {
    return loadTranscript(sessionId);
}
export function persistSession(sessionId, transcript) {
    saveTranscript(sessionId, transcript);
}
export function listSessionSummaries() {
    return listTranscripts();
}
export function renameSession(sessionId, nextName) {
    return renameTranscript(sessionId, nextName);
}
export function deleteSession(sessionId) {
    return deleteTranscript(sessionId);
}
export function replaceDeletedCurrentSession() {
    return createEmptySession();
}
export function listRewindEntries(transcript) {
    return transcript
        .map((message, index) => ({ message, index }))
        .filter(({ message }) => message.role === 'user' && message.content.trim().length > 0)
        .map(({ message, index }) => ({
        transcriptIndex: index,
        preview: message.content.replace(/\s+/g, ' ').trim(),
    }));
}
export function rewindTranscript(transcript, transcriptIndex) {
    const clampedIndex = Math.max(0, Math.min(transcript.length, transcriptIndex));
    return transcript.slice(0, clampedIndex);
}
