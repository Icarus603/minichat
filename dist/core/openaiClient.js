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
    return readFile('SOUL.md');
}
function buildResponsesInput(messages) {
    return messages
        .filter((message) => message.role === 'user' || message.role === 'ai')
        .map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: [
            {
                type: 'input_text',
                text: message.content,
            },
        ],
    }));
}
function extractTextFromResponse(response) {
    if ('output_text' in response && typeof response.output_text === 'string' && response.output_text.trim()) {
        return response.output_text;
    }
    const outputs = 'output' in response && Array.isArray(response.output) ? response.output : [];
    const texts = outputs.flatMap((item) => {
        if (!item || item.type !== 'message' || !Array.isArray(item.content)) {
            return [];
        }
        return item.content
            .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
            .map(content => content.text);
    });
    return texts.join('\n').trim();
}
function createClient(config) {
    return new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : undefined,
        defaultHeaders: config.provider === 'openrouter'
            ? {
                'HTTP-Referer': 'https://github.com/Icarus603/minichat',
                'X-Title': 'MiniChat',
            }
            : undefined,
    });
}
export async function runBackgroundPrompt(prompt, config) {
    if (!config.apiKey) {
        if (!hasMinichatCodexAuth()) {
            throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
        }
        return await chatWithCodexAuth([{ role: 'user', content: prompt }], config.model, config.reasoningEffort, 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.');
    }
    const client = createClient(config);
    if (config.provider === 'openrouter') {
        const response = await client.chat.completions.create({
            model: config.model,
            reasoning_effort: config.reasoningEffort,
            messages: [
                {
                    role: 'system',
                    content: 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        });
        return response.choices[0]?.message?.content ?? '';
    }
    const response = await client.responses.create({
        model: config.model,
        instructions: 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.',
        input: prompt,
        reasoning: config.reasoningEffort
            ? {
                effort: config.reasoningEffort,
            }
            : undefined,
    });
    return extractTextFromResponse(response);
}
export async function chat(messages, config) {
    const system = buildSystemPrompt();
    const systemMessages = system ? [{ role: 'system', content: system }] : [];
    if (!config.apiKey) {
        if (!hasMinichatCodexAuth()) {
            throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
        }
        return await chatWithCodexAuth(messages, config.model, config.reasoningEffort, system);
    }
    const client = createClient(config);
    if (config.provider === 'openrouter') {
        const response = await client.chat.completions.create({
            model: config.model,
            reasoning_effort: config.reasoningEffort,
            messages: [
                ...systemMessages,
                ...messages
                    .filter((m) => m.role === 'user' || m.role === 'ai')
                    .map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content,
                })),
            ],
        });
        return response.choices[0]?.message?.content ?? '(no response)';
    }
    const response = await client.responses.create({
        model: config.model,
        instructions: system || undefined,
        input: buildResponsesInput(messages),
        reasoning: config.reasoningEffort
            ? {
                effort: config.reasoningEffort,
            }
            : undefined,
    });
    return extractTextFromResponse(response) || '(no response)';
}
