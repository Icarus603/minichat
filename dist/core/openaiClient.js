import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { configDir } from './configManager.js';
import { chatWithCodexAuth, hasMinichatCodexAuth } from './codexAuth.js';
function readFile(name) {
    try {
        return fs.readFileSync(path.join(configDir, name), 'utf-8').trim();
    }
    catch {
        return '';
    }
}
function buildSystemPrompt() {
    const soul = readFile('SOUL.md');
    const memory = readFile('MEMORY.md');
    const parts = [soul, memory].filter(Boolean);
    return parts.join('\n\n---\n\n');
}
export async function chat(messages, config) {
    const system = buildSystemPrompt();
    const systemMessages = system ? [{ role: 'system', content: system }] : [];
    if (!config.apiKey) {
        if (!hasMinichatCodexAuth()) {
            throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
        }
        return await chatWithCodexAuth(messages, config.model, system);
    }
    const client = new OpenAI({
        apiKey: config.apiKey,
    });
    const response = await client.chat.completions.create({
        model: config.model,
        messages: [
            ...systemMessages,
            ...messages.map((m) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
            })),
        ],
    });
    return response.choices[0]?.message?.content ?? '(no response)';
}
