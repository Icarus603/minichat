import fs from 'node:fs';
import path from 'node:path';
import { configDir, getConfigDir } from './configStore.js';

export type LoginMethod = 'chatgpt' | 'device';

export interface CodexAuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  account_id: string;
}

export interface MinichatAuthFile {
  authMode: LoginMethod;
  lastRefresh: string | null;
  tokens: CodexAuthTokens;
}

export interface CodexAuthFile {
  auth_mode?: 'chatgpt' | 'device_code' | string;
  last_refresh?: string;
  OPENAI_API_KEY?: string | null;
  tokens?: Partial<CodexAuthTokens>;
}

export const codexAuthFile = path.join(process.env['HOME']!, '.codex', 'auth.json');
export const minichatAuthFile = path.join(configDir, 'auth.json');

function getCodexAuthFile() {
  return path.join(process.env['HOME']!, '.codex', 'auth.json');
}

function getMinichatAuthFile() {
  return path.join(getConfigDir(), 'auth.json');
}

export function readCodexAuthFile(): CodexAuthFile | null {
  try {
    return JSON.parse(fs.readFileSync(getCodexAuthFile(), 'utf8')) as CodexAuthFile;
  } catch {
    return null;
  }
}

export function readCodexApiKeyFromAuth(): string | null {
  const parsed = readCodexAuthFile();
  const apiKey = parsed?.OPENAI_API_KEY?.trim();
  return apiKey || null;
}

export function writeImportedCodexAuth(method: LoginMethod, auth: MinichatAuthFile): void {
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(getMinichatAuthFile(), JSON.stringify({
    ...auth,
    authMode: method,
  }, null, 2));
}

export function readImportedCodexAuth(): MinichatAuthFile | null {
  try {
    const authFile = getMinichatAuthFile();
    if (!fs.existsSync(authFile)) {
      return null;
    }

    const parsed = JSON.parse(fs.readFileSync(authFile, 'utf8')) as Partial<MinichatAuthFile>;
    if (!parsed.tokens?.access_token || !parsed.tokens?.refresh_token) {
      return null;
    }

    return parsed as MinichatAuthFile;
  } catch {
    return null;
  }
}

export function clearImportedCodexAuth(): void {
  try {
    const authFile = getMinichatAuthFile();
    if (fs.existsSync(authFile)) {
      fs.unlinkSync(authFile);
    }
  } catch {}
}
