import fs from 'fs';
import path from 'path';
import { configDir } from './configManager.js';

const soulFile = path.join(configDir, 'SOUL.md');

export type SoulSection =
  | 'Core Spirit'
  | 'User Preferences'
  | 'Ongoing Context'
  | 'How To Be With This User'
  | 'Avoid';

export type SoulEntry = {
  section: SoulSection;
  note: string;
};

const sectionOrder: SoulSection[] = [
  'Core Spirit',
  'User Preferences',
  'Ongoing Context',
  'How To Be With This User',
  'Avoid',
];

const defaultSoul = [
  '# SOUL',
  '',
  '## Core Spirit',
  '- MiniChat is a warm, perceptive, emotionally intelligent conversational partner.',
  '- MiniChat should feel like a real friend: natural, present, grounded, and genuinely engaged.',
  '- MiniChat should avoid assistant clichés, corporate phrasing, and empty reassurance.',
  '',
  '## User Preferences',
  '',
  '## Ongoing Context',
  '',
  '## How To Be With This User',
  '- Notice what helps this user feel understood, and let that slowly shape the relationship.',
  '- Let the soul evolve gradually from repeated interaction, not one-off moods.',
  '',
  '## Avoid',
  '- Do not become cold, fake, overly polished, or emotionally absent.',
].join('\n') + '\n';

function ensureSoulFile(): void {
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  if (!fs.existsSync(soulFile)) {
    fs.writeFileSync(soulFile, defaultSoul);
  }
}

function normalizeNote(note: string): string {
  return note.trim().replace(/\s+/g, ' ');
}

function normalizeForCompare(note: string): string {
  return note
    .replace(/\(\d{4}-\d{2}-\d{2}\)\s*$/, '')
    .replace(/^-+\s*/, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function sectionHeader(section: SoulSection): string {
  return `## ${section}`;
}

function insertUnderSection(content: string, section: SoulSection, bullet: string): string {
  const lines = content.split('\n');
  const targetHeader = sectionHeader(section);
  const headerIndex = lines.findIndex(line => line.trim() === targetHeader);

  if (headerIndex === -1) {
    const trimmed = content.trimEnd();
    return `${trimmed}\n\n${targetHeader}\n${bullet}\n`;
  }

  let insertIndex = headerIndex + 1;
  while (insertIndex < lines.length) {
    const line = lines[insertIndex];
    if (line.startsWith('## ')) {
      break;
    }
    insertIndex += 1;
  }

  const before = lines.slice(0, insertIndex);
  const after = lines.slice(insertIndex);

  while (before.length > 0 && before[before.length - 1] === '') {
    before.pop();
  }

  return [...before, bullet, '', ...after].join('\n').replace(/\n+$/, '\n');
}

export function appendSoulEntry(entry: SoulEntry): boolean {
  const note = normalizeNote(entry.note);
  if (!note) {
    return false;
  }

  ensureSoulFile();
  const existing = fs.readFileSync(soulFile, 'utf8');
  const timestamp = new Date().toISOString().slice(0, 10);
  const bullet = `- ${note} (${timestamp})`;

  const existingNotes = existing
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .map(line => normalizeForCompare(line));

  if (existingNotes.includes(normalizeForCompare(bullet))) {
    return false;
  }

  const next = insertUnderSection(existing, entry.section, bullet);
  fs.writeFileSync(soulFile, next);
  return true;
}

export function appendSoulEntries(entries: SoulEntry[]): SoulEntry[] {
  return entries.filter(entry => appendSoulEntry(entry));
}

export function readSoulText(): string {
  try {
    ensureSoulFile();
    return fs.readFileSync(soulFile, 'utf8');
  } catch {
    return '';
  }
}

export function getSoulFilePath(): string {
  return soulFile;
}

export function getSoulSectionOrder(): SoulSection[] {
  return [...sectionOrder];
}
