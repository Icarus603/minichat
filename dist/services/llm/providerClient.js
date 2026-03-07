import OpenAI from 'openai';
import { readSoulText } from '../storage/soulStore.js';
import { chatWithCodexAuth, hasMinichatCodexAuth } from '../auth/codexAuthService.js';
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
            .map((content) => content.text);
    });
    return texts.join('\n').trim();
}
function createOpenAICompatibleClient(config) {
    return new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.provider === 'openrouter'
            ? 'https://openrouter.ai/api/v1'
            : config.provider === 'deepseek'
                ? 'https://api.deepseek.com'
                : undefined,
        defaultHeaders: config.provider === 'openrouter'
            ? {
                'HTTP-Referer': 'https://github.com/Icarus603/minichat',
                'X-Title': 'MiniChat',
            }
            : undefined,
    });
}
function buildResponsesInput(messages) {
    return messages
        .filter((message) => message.role === 'user' || message.role === 'ai')
        .map((message) => ({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
    }));
}
function getSystemPrompt() {
    return readSoulText();
}
const codexProviderClient = {
    async chat(messages, config, signal) {
        const system = getSystemPrompt();
        if (!hasMinichatCodexAuth()) {
            throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
        }
        return await chatWithCodexAuth(messages, config.model, config.reasoningEffort, system, signal);
    },
    async runBackgroundPrompt(prompt, config, signal) {
        if (!hasMinichatCodexAuth()) {
            throw new Error('Missing OpenAI API key and ChatGPT auth. Re-run setup.');
        }
        return await chatWithCodexAuth([{ role: 'user', content: prompt }], config.model, config.reasoningEffort, 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.', signal);
    },
};
const openAIKeyProviderClient = {
    async chat(messages, config, signal) {
        const client = createOpenAICompatibleClient(config);
        const response = await client.responses.create({
            model: config.model,
            instructions: getSystemPrompt() || undefined,
            input: buildResponsesInput(messages),
            reasoning: config.reasoningEffort ? { effort: config.reasoningEffort } : undefined,
        }, signal ? { signal } : undefined);
        return extractTextFromResponse(response) || '(no response)';
    },
    async runBackgroundPrompt(prompt, config, signal) {
        const client = createOpenAICompatibleClient(config);
        const response = await client.responses.create({
            model: config.model,
            instructions: 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.',
            input: prompt,
            reasoning: config.reasoningEffort ? { effort: config.reasoningEffort } : undefined,
        }, signal ? { signal } : undefined);
        return extractTextFromResponse(response);
    },
};
const openAICompatibleChatProviderClient = {
    async chat(messages, config, signal) {
        const client = createOpenAICompatibleClient(config);
        const system = getSystemPrompt();
        const response = await client.chat.completions.create({
            model: config.model,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                ...messages
                    .filter((message) => message.role === 'user' || message.role === 'ai')
                    .map((message) => ({
                    role: message.role === 'user' ? 'user' : 'assistant',
                    content: message.content,
                })),
            ],
        }, signal ? { signal } : undefined);
        return response.choices[0]?.message?.content ?? '(no response)';
    },
    async runBackgroundPrompt(prompt, config, signal) {
        const client = createOpenAICompatibleClient(config);
        const response = await client.chat.completions.create({
            model: config.model,
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
        }, signal ? { signal } : undefined);
        return response.choices[0]?.message?.content ?? '';
    },
};
export function getProviderClient(config) {
    if (!config.apiKey) {
        return codexProviderClient;
    }
    if (config.provider === 'openrouter' || config.provider === 'deepseek') {
        return openAICompatibleChatProviderClient;
    }
    return openAIKeyProviderClient;
}
