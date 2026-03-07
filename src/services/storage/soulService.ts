import type { ChatMessage } from '../../shared/chat.js';
import type { StoredConfig } from './configStore.js';
import { appendSoulEntries, readSoulText, type SoulEntry, type SoulSection } from './soulStore.js';
import { getProviderClient } from '../llm/providerClient.js';

type RawSoulEntry = {
  section?: string;
  note?: string;
};

export type ContextEvolutionResult = {
  soul: SoulEntry[];
};

const validSections: SoulSection[] = [
  'Core Spirit',
  'User Preferences',
  'Ongoing Context',
  'How To Be With This User',
  'Avoid',
];

function isSoulSection(value: string): value is SoulSection {
  return validSections.includes(value as SoulSection);
}

function extractJsonObject(raw: string): string {
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }

  return raw.trim();
}

function parseEvolutionResult(raw: string): ContextEvolutionResult {
  try {
    const parsed = JSON.parse(extractJsonObject(raw)) as { soul?: RawSoulEntry[] };
    const soul = Array.isArray(parsed.soul)
      ? parsed.soul
          .filter((item): item is RawSoulEntry => Boolean(item && typeof item === 'object'))
          .filter((item): item is SoulEntry => Boolean(
            typeof item.note === 'string' &&
            typeof item.section === 'string' &&
            isSoulSection(item.section),
          ))
      : [];

    return { soul };
  } catch {
    return { soul: [] };
  }
}

function buildConversationSnippet(messages: ChatMessage[]): string {
  return messages
    .slice(-6)
    .filter(message => message.role !== 'status')
    .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
    .join('\n');
}

function buildEvolutionPrompt(messages: ChatMessage[], soulText: string): string {
  const conversation = buildConversationSnippet(messages);
  const existingSoul = soulText.trim() || '(empty)';

  return [
    'You are maintaining MiniChat SOUL.md after a conversation turn.',
    'Decide whether the latest conversation reveals anything stable enough to persist.',
    'Return strict JSON only with this exact shape:',
    '{"soul":[{"section":"User Preferences","note":"..."}]}',
    '',
    'Valid sections:',
    '- Core Spirit',
    '- User Preferences',
    '- Ongoing Context',
    '- How To Be With This User',
    '- Avoid',
    '',
    'Section meanings:',
    '- User Preferences: stable user tastes, communication preferences, explicit likes/dislikes.',
    '- Ongoing Context: durable project or life context likely to matter later.',
    '- How To Be With This User: how MiniChat should respond, sound, or show up for this user over time.',
    '- Avoid: patterns MiniChat should avoid with this user.',
    '- Core Spirit: only for very high-level identity rules; use rarely.',
    '',
    'Rules:',
    '- Be conservative. Most turns should produce no update at all.',
    '- Only save durable things. Ignore transient moods, one-off requests, and generic chat filler.',
    '- A single casual sentence should usually not be saved unless it clearly states a lasting preference or ongoing context.',
    '- If the same user statement is both a preference and a style-shaping instruction, prefer writing two entries only when both are truly useful and distinct.',
    '- Avoid duplicates or near-duplicates of what is already in SOUL.md.',
    '- Keep each note short, specific, and append-ready as a single bullet.',
    '- If nothing should be saved, return {"soul":[]}.',
    '- At most 2 entries total.',
    '',
    'Existing SOUL:',
    existingSoul,
    '',
    'Latest conversation snippet:',
    conversation,
  ].join('\n');
}

export async function analyzeContextEvolution(
  messages: ChatMessage[],
  config: StoredConfig,
  signal?: AbortSignal,
): Promise<ContextEvolutionResult> {
  const prompt = buildEvolutionPrompt(messages, readSoulText());
  const raw = await getProviderClient(config).runBackgroundPrompt(prompt, config, signal);
  return parseEvolutionResult(raw);
}

export function applyContextEvolution(result: ContextEvolutionResult): ContextEvolutionResult {
  return {
    soul: appendSoulEntries(result.soul),
  };
}
