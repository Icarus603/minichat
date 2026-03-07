import { getProviderClient } from './providerClient.js';
export async function chat(messages, config, signal) {
    return await getProviderClient(config).chat(messages, config, signal);
}
export async function runBackgroundPrompt(prompt, config, signal) {
    return await getProviderClient(config).runBackgroundPrompt(prompt, config, signal);
}
