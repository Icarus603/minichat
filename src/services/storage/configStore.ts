import fs from 'fs';
import path from 'path';

export const configDir = path.join(process.env['HOME']!, '.minichat');

export function getConfigDir(): string {
  return path.join(process.env['HOME']!, '.minichat');
}

function getConfigFile(): string {
  return path.join(getConfigDir(), 'config.json');
}

export interface StoredConfig {
  provider?: 'openai' | 'openrouter' | 'deepseek';
  apiKey?: string;
  model: string;
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
  authMode?: 'chatgpt' | 'device' | 'apiKey';
}

function normalizeApiKey(apiKey: unknown): string | undefined {
  if (typeof apiKey !== 'string') {
    return undefined;
  }

  const normalized = apiKey
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\[200~|\[201~/g, '')
    .replace(/[\u0000-\u001F\u007F\s]+/g, '');
  return normalized.length > 0 ? normalized : undefined;
}

const DEFAULT_SOUL_TEXT = [
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
  '- Let the relationship evolve gradually from repeated interaction, not one-off moods.',
  '- Notice what helps this user feel understood, then let that shape your voice and presence over time.',
  '',
  '## Avoid',
  '- Do not become cold, fake, overly polished, or emotionally absent.',
].join('\n');

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureDefaultSoul(): void {
  const soulFile = path.join(getConfigDir(), 'SOUL.md');
  if (!fs.existsSync(soulFile)) {
    fs.writeFileSync(soulFile, DEFAULT_SOUL_TEXT);
  }
}

export function readConfig(): StoredConfig | null {
  try {
    const configFile = getConfigFile();
    if (!fs.existsSync(configFile)) {
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8')) as Partial<StoredConfig> & { provider?: string };
    const provider =
      parsed.provider === 'openrouter' || parsed.provider === 'deepseek'
        ? parsed.provider
        : 'openai';

    if (typeof parsed.model === 'string' && (typeof parsed.apiKey === 'string' || parsed.authMode)) {
      return {
        provider,
        apiKey: normalizeApiKey(parsed.apiKey),
        model: parsed.model,
        reasoningEffort:
          parsed.reasoningEffort === 'none' ||
          parsed.reasoningEffort === 'minimal' ||
          parsed.reasoningEffort === 'low' ||
          parsed.reasoningEffort === 'medium' ||
          parsed.reasoningEffort === 'high' ||
          parsed.reasoningEffort === 'xhigh'
            ? parsed.reasoningEffort
            : undefined,
        authMode: parsed.authMode,
      };
    }
  } catch {}

  return null;
}

export function writeConfig(config: StoredConfig): void {
  ensureConfigDir();
  const normalizedConfig: StoredConfig = {
    ...config,
    apiKey: normalizeApiKey(config.apiKey),
  };
  fs.writeFileSync(getConfigFile(), JSON.stringify(normalizedConfig, null, 2));
  ensureDefaultSoul();
}

export function clearStoredConfig(): void {
  try {
    const configFile = getConfigFile();
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile);
    }
  } catch {}
}
