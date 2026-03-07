import OpenAI from 'openai';
import { readSoulText } from '../storage/soulStore.js';
import { chatWithCodexAuth, hasMinichatCodexAuth } from '../auth/codexAuthService.js';
function formatProviderError(error) {
    if (!(error instanceof Error)) {
        return new Error(String(error));
    }
    const status = 'status' in error && typeof error.status === 'number' ? error.status : null;
    const code = 'code' in error && typeof error.code === 'string' ? error.code : null;
    const cause = 'cause' in error && error.cause ? String(error.cause) : null;
    const requestId = 'request_id' in error && typeof error.request_id === 'string' ? error.request_id : null;
    const details = [status ? `status ${status}` : null, code, requestId ? `request ${requestId}` : null, cause]
        .filter(Boolean)
        .join(' · ');
    const message = details
        ? `${error.message} (${details})`
        : error.message;
    return new Error(message);
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
            .map((content) => content.text);
    });
    return texts.join('\n').trim();
}
function createOpenAICompatibleClient(config) {
    const sanitizedApiKey = typeof config.apiKey === 'string'
        ? config.apiKey
            .trim()
            .replace(/^["']+|["']+$/g, '')
            .replace(/\[200~|\[201~/g, '')
            .replace(/[\u0000-\u001F\u007F\s]+/g, '')
        : config.apiKey;
    return new OpenAI({
        apiKey: sanitizedApiKey,
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
function isFetchTransportError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    const cause = 'cause' in error ? error.cause : null;
    return error.message.includes('Connection error') ||
        error.message.includes('fetch failed') ||
        String(cause ?? '').includes('fetch failed');
}
async function diagnoseOpenAITransport(config) {
    const sanitizedApiKey = typeof config.apiKey === 'string'
        ? config.apiKey
            .trim()
            .replace(/^["']+|["']+$/g, '')
            .replace(/\[200~|\[201~/g, '')
            .replace(/[\u0000-\u001F\u007F\s]+/g, '')
        : config.apiKey;
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                Authorization: `Bearer ${sanitizedApiKey}`,
            },
        });
        return `direct fetch ok (status ${response.status})`;
    }
    catch (error) {
        if (error instanceof Error) {
            const cause = 'cause' in error ? error.cause : null;
            return `direct fetch failed: ${error.name}: ${error.message}${cause ? ` · ${String(cause)}` : ''}`;
        }
        return `direct fetch failed: ${String(error)}`;
    }
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
        try {
            const client = createOpenAICompatibleClient(config);
            const response = await client.responses.create({
                model: config.model,
                instructions: getSystemPrompt() || undefined,
                input: buildResponsesInput(messages),
                reasoning: config.reasoningEffort ? { effort: config.reasoningEffort } : undefined,
            }, signal ? { signal } : undefined);
            return extractTextFromResponse(response) || '(no response)';
        }
        catch (error) {
            if (isFetchTransportError(error)) {
                const diagnostic = await diagnoseOpenAITransport(config);
                throw new Error(`${formatProviderError(error).message} · ${diagnostic}`);
            }
            throw formatProviderError(error);
        }
    },
    async runBackgroundPrompt(prompt, config, signal) {
        try {
            const client = createOpenAICompatibleClient(config);
            const response = await client.responses.create({
                model: config.model,
                instructions: 'You are doing an internal MiniChat background analysis task. Reply only with the requested output.',
                input: prompt,
                reasoning: config.reasoningEffort ? { effort: config.reasoningEffort } : undefined,
            }, signal ? { signal } : undefined);
            return extractTextFromResponse(response);
        }
        catch (error) {
            if (isFetchTransportError(error)) {
                const diagnostic = await diagnoseOpenAITransport(config);
                throw new Error(`${formatProviderError(error).message} · ${diagnostic}`);
            }
            throw formatProviderError(error);
        }
    },
};
const openAICompatibleChatProviderClient = {
    async chat(messages, config, signal) {
        try {
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
        }
        catch (error) {
            throw formatProviderError(error);
        }
    },
    async runBackgroundPrompt(prompt, config, signal) {
        try {
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
        }
        catch (error) {
            throw formatProviderError(error);
        }
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
