import { clearConfig, getConfig, saveConfig } from '../../core/configManager.js';
import { clearMinichatCodexAuth, readCodexApiKey, runCodexLogout, saveMinichatCodexAuth } from '../../core/codexAuth.js';

export const saveOpenAIConfig = (apiKey: string) => {
  saveConfig({
    provider: 'openai',
    apiKey,
    model: 'gpt-4.1',
    authMode: 'apiKey',
  });
};

export const saveOpenRouterConfig = (apiKey: string) => {
  saveConfig({
    provider: 'openrouter',
    apiKey,
    model: 'openai/gpt-5.3-codex',
    authMode: 'apiKey',
  });
};

export const saveDeepSeekConfig = (apiKey: string, model: 'deepseek-chat' | 'deepseek-reasoner') => {
  saveConfig({
    provider: 'deepseek',
    apiKey,
    model,
    authMode: 'apiKey',
  });
};

export const saveChatGPTConfig = (method: 'chatgpt' | 'device') => {
  saveConfig({
    provider: 'openai',
    model: 'gpt-5.4',
    authMode: method,
  });
};

export async function clearLoginState(): Promise<void> {
  clearConfig();
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
  return Boolean(getConfig());
}
