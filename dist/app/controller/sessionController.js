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
