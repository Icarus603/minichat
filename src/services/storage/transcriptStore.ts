import fs from 'fs';
import path from 'path';
import type { ChatMessage } from '../../core/chatManager.js';

function getTranscriptDir(): string {
  return path.join(process.env['HOME']!, '.minichat', 'transcripts');
}

export type TranscriptSummary = {
  id: string;
  name: string;
  date: string;
  preview: string;
  messageCount: number;
};

function transcriptPath(session: string): string {
  return path.join(getTranscriptDir(), `${session}.json`);
}

export function sanitizeTranscriptName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function summarizeTranscript(messages: ChatMessage[]): string {
  const lastMeaningful = [...messages]
    .reverse()
    .find((message) =>
      message.role !== 'status' &&
      typeof message.content === 'string' &&
      message.content.trim().length > 0,
    );

  if (!lastMeaningful) {
    return 'Empty conversation';
  }

  const normalized = lastMeaningful.content.replace(/\s+/g, ' ').trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}...` : normalized;
}

export function saveTranscript(session: string, messages: ChatMessage[]): void {
  const transcriptDir = getTranscriptDir();
  if (!fs.existsSync(transcriptDir)) {
    fs.mkdirSync(transcriptDir, { recursive: true });
  }

  const persistable = messages.filter((message) => message.role === 'user' || message.role === 'ai');
  fs.writeFileSync(transcriptPath(session), JSON.stringify(persistable, null, 2));
}

export function loadTranscript(session: string): ChatMessage[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(transcriptPath(session), 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((message): message is ChatMessage => Boolean(
      message &&
      typeof message === 'object' &&
      'role' in message &&
      'content' in message &&
      (((message as { role?: string }).role === 'user') || ((message as { role?: string }).role === 'ai')) &&
      typeof (message as { content?: unknown }).content === 'string',
    ));
  } catch {
    return [];
  }
}

export function listTranscripts(): TranscriptSummary[] {
  const transcriptDir = getTranscriptDir();
  if (!fs.existsSync(transcriptDir)) {
    return [];
  }

  return fs
    .readdirSync(transcriptDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .reverse()
    .map((file) => {
      const id = file.replace('.json', '');
      const messages = loadTranscript(id);
      return {
        id,
        name: id,
        date: fs.statSync(transcriptPath(id)).mtime.toLocaleString(),
        preview: summarizeTranscript(messages),
        messageCount: messages.length,
      };
    });
}

export function renameTranscript(currentId: string, nextName: string): string | null {
  const sanitized = sanitizeTranscriptName(nextName);
  if (!sanitized || sanitized === currentId) {
    return sanitized || null;
  }

  const currentPath = transcriptPath(currentId);
  const nextPath = transcriptPath(sanitized);
  if (!fs.existsSync(currentPath) || fs.existsSync(nextPath)) {
    return null;
  }

  fs.renameSync(currentPath, nextPath);
  return sanitized;
}

export function deleteTranscript(session: string): boolean {
  try {
    const filePath = transcriptPath(session);
    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}
