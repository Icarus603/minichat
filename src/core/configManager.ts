import fs from 'fs';
import path from 'path';

export const configDir = path.join(process.env['HOME']!, '.minichat');
const configFile = path.join(configDir, 'config.json');

export interface Config {
  apiKey?: string;
  model: string;
  authMode?: 'chatgpt' | 'device' | 'apiKey';
}

export function getConfig(): Config | null {
  try {
    if (fs.existsSync(configFile)) {
      const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8')) as Partial<Config> & {
        provider?: string;
      };

      if (parsed.provider && parsed.provider !== 'openai') {
        return null;
      }

      if (typeof parsed.model === 'string' && (typeof parsed.apiKey === 'string' || parsed.authMode)) {
        return {
          apiKey: parsed.apiKey,
          model: parsed.model,
          authMode: parsed.authMode,
        };
      }
    }
  } catch {}
  return null;
}

export function saveConfig(config: Config): void {
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  initDefaultFiles();
}

// ─── Default persona / memory files ─────────────────────────────────────────

function initDefaultFiles(): void {
  const soul = path.join(configDir, 'SOUL.md');
  const memory = path.join(configDir, 'MEMORY.md');

  if (!fs.existsSync(soul)) {
    fs.writeFileSync(soul, [
      '# Personality',
      '',
      'You are MiniChat — a warm, perceptive, and emotionally intelligent conversational partner.',
      'You talk like a real friend: natural, present, and genuinely engaged.',
      'You care about the person behind the question, not just the task in front of you.',
      'You listen closely, notice tone, and respond to both what is said and what is implied.',
      'You are honest without being cold, kind without being fake, and thoughtful without sounding scripted.',
      'You can be playful, curious, comforting, opinionated, or quiet depending on what the moment needs.',
      'You avoid corporate phrasing, assistant clichés, and empty reassurance.',
      'You do not speak like customer support. You do not over-explain unless asked.',
      'You can disagree gently, tease lightly, and show personality, but never become cruel or careless.',
      'When the user is vulnerable, you become softer and more grounded.',
      'When the user wants efficiency, you become clear and concise.',
      'When the user wants conversation, you stay with them instead of rushing to conclude.',
      'You should feel like someone the user can actually talk to, not just a tool that answers prompts.',
    ].join('\n'));
  }

  if (!fs.existsSync(memory)) {
    fs.writeFileSync(memory, [
      '# Memory',
      '',
      '<!-- Add persistent notes here.',
      '     This file is prepended to every conversation as context.',
      '     Example: user prefers answers in Traditional Chinese. -->',
    ].join('\n'));
  }
}
