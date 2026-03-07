import fs from 'fs';
import path from 'path';
import { getConfigDir } from './configStore.js';
function getSoulFile() {
    return path.join(getConfigDir(), 'SOUL.md');
}
const sectionOrder = [
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
function ensureSoulFile() {
    const dir = getConfigDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const soulFile = getSoulFile();
    if (!fs.existsSync(soulFile)) {
        fs.writeFileSync(soulFile, defaultSoul);
    }
}
function normalizeNote(note) {
    return note.trim().replace(/\s+/g, ' ');
}
function normalizeForCompare(note) {
    return note
        .replace(/\(\d{4}-\d{2}-\d{2}\)\s*$/, '')
        .replace(/^-+\s*/, '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}
function sectionHeader(section) {
    return `## ${section}`;
}
function insertUnderSection(content, section, bullet) {
    const lines = content.split('\n');
    const targetHeader = sectionHeader(section);
    const headerIndex = lines.findIndex((line) => line.trim() === targetHeader);
    if (headerIndex === -1) {
        const trimmed = content.trimEnd();
        return `${trimmed}\n\n${targetHeader}\n${bullet}\n`;
    }
    let insertIndex = headerIndex + 1;
    while (insertIndex < lines.length) {
        if (lines[insertIndex].startsWith('## ')) {
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
export function appendSoulEntry(entry) {
    const note = normalizeNote(entry.note);
    if (!note) {
        return false;
    }
    ensureSoulFile();
    const soulFile = getSoulFile();
    const existing = fs.readFileSync(soulFile, 'utf8');
    const timestamp = new Date().toISOString().slice(0, 10);
    const bullet = `- ${note} (${timestamp})`;
    const existingNotes = existing
        .split('\n')
        .filter((line) => line.trim().startsWith('- '))
        .map((line) => normalizeForCompare(line));
    if (existingNotes.includes(normalizeForCompare(bullet))) {
        return false;
    }
    const next = insertUnderSection(existing, entry.section, bullet);
    fs.writeFileSync(soulFile, next);
    return true;
}
export function appendSoulEntries(entries) {
    return entries.filter((entry) => appendSoulEntry(entry));
}
export function readSoulText() {
    try {
        ensureSoulFile();
        return fs.readFileSync(getSoulFile(), 'utf8');
    }
    catch {
        return '';
    }
}
export function getSoulFilePath() {
    return getSoulFile();
}
export function getSoulSectionOrder() {
    return [...sectionOrder];
}
