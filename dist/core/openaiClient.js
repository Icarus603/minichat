import { getProviderClient } from '../services/llm/providerClient.js';
export async function runBackgroundPrompt(prompt, config, signal) {
    return await getProviderClient(config).runBackgroundPrompt(prompt, config, signal);
}
export async function chat(messages, config, signal) {
    return await getProviderClient(config).chat(messages, config, signal);
}
