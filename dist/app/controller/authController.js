import { clearConfig, getConfig, saveConfig } from '../../core/configManager.js';
import { clearMinichatCodexAuth, readCodexApiKey, runCodexLogout, saveMinichatCodexAuth } from '../../core/codexAuth.js';
const sanitizeApiKey = (apiKey) => apiKey
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\[200~|\[201~/g, '')
    .replace(/[\u0000-\u001F\u007F\s]+/g, '');
export const saveOpenAIConfig = (apiKey) => {
    saveConfig({
        provider: 'openai',
        apiKey: sanitizeApiKey(apiKey),
        model: 'gpt-4.1',
        authMode: 'apiKey',
    });
};
export const saveOpenRouterConfig = (apiKey) => {
    saveConfig({
        provider: 'openrouter',
        apiKey: sanitizeApiKey(apiKey),
        model: 'openai/gpt-5.3-codex',
        authMode: 'apiKey',
    });
};
export const saveDeepSeekConfig = (apiKey, model) => {
    saveConfig({
        provider: 'deepseek',
        apiKey: sanitizeApiKey(apiKey),
        model,
        authMode: 'apiKey',
    });
};
export const saveChatGPTConfig = (method) => {
    saveConfig({
        provider: 'openai',
        model: 'gpt-5.4',
        authMode: method,
    });
};
export async function clearLoginState() {
    clearConfig();
    clearMinichatCodexAuth();
    await runCodexLogout();
}
export function getImportedCodexApiKey() {
    return readCodexApiKey();
}
export function importCodexAuth(method) {
    return saveMinichatCodexAuth(method);
}
export function hasConfig() {
    return Boolean(getConfig());
}
