import {
  clearStoredConfig,
  normalizeApiKey,
  readConfig,
  writeConfig,
} from '../../services/storage/configStore.js';
import {
  clearMinichatCodexAuth,
  readCodexApiKey,
  runCodexLogout,
  saveMinichatCodexAuth,
} from '../../services/auth/codexAuthService.js';

export const saveOpenAIConfig = (apiKey: string) => {
  writeConfig({
    provider: 'openai',
    apiKey: normalizeApiKey(apiKey),
    model: 'gpt-4.1',
    authMode: 'apiKey',
  });
};

export const saveOpenRouterConfig = (apiKey: string) => {
  writeConfig({
    provider: 'openrouter',
    apiKey: normalizeApiKey(apiKey),
    model: 'openai/gpt-5.3-codex',
    authMode: 'apiKey',
  });
};

export const saveDeepSeekConfig = (apiKey: string, model: 'deepseek-chat' | 'deepseek-reasoner') => {
  writeConfig({
    provider: 'deepseek',
    apiKey: normalizeApiKey(apiKey),
    model,
    authMode: 'apiKey',
  });
};

export const saveChatGPTConfig = (method: 'chatgpt' | 'device') => {
  writeConfig({
    provider: 'openai',
    model: 'gpt-5.4',
    authMode: method,
  });
};

export async function clearLoginState(): Promise<void> {
  clearStoredConfig();
  clearMinichatCodexAuth();
  await runCodexLogout();
}

export function getImportedCodexApiKey(): string | null {
  return readCodexApiKey();
}

export function importCodexAuth(method: 'chatgpt' | 'device'): boolean {
  return saveMinichatCodexAuth(method);
}

export function hasConfig() {
  return Boolean(readConfig());
}
