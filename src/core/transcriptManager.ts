import fs from 'fs';
import path from 'path';
import type { ChatMessage } from './chatManager.js';

const transcriptDir = path.join(process.env['HOME']!, '.minichat', 'transcripts');

export function saveTranscript(session: string, messages: ChatMessage[]): void {
  if (!fs.existsSync(transcriptDir)) fs.mkdirSync(transcriptDir, { recursive: true });
  fs.writeFileSync(
    path.join(transcriptDir, session + '.json'),
    JSON.stringify(messages, null, 2)
  );
}

export function loadTranscript(session: string): ChatMessage[] {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(transcriptDir, session + '.json'), 'utf-8')
    ) as ChatMessage[];
  } catch {
    return [];
  }
}

export function listTranscripts(): { id: string; name: string; date: string }[] {
  if (!fs.existsSync(transcriptDir)) return [];
  return fs
    .readdirSync(transcriptDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse()
    .map((f) => ({
      id: f.replace('.json', ''),
      name: f.replace('.json', ''),
      date: fs.statSync(path.join(transcriptDir, f)).mtime.toLocaleString(),
    }));
}
