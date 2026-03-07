import { analyzeContextEvolution, applyContextEvolution } from '../../services/storage/soulService.js';
import { chat } from '../../services/llm/providerClientFacade.js';
export function buildInterruptedTranscript(transcript) {
    return [...transcript, { role: 'status', content: 'Generation stopped' }];
}
export function buildErrorTranscript(transcript, error) {
    return [
        ...transcript,
        {
            role: 'ai',
            content: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
    ];
}
export async function runChatTurn(transcript, input, config, signal) {
    const userMsg = { role: 'user', content: input };
    const updated = [...transcript, userMsg];
    const statusMessages = [];
    const planned = await analyzeContextEvolution(updated, config, signal);
    if (planned.soul.length > 0) {
        const applied = applyContextEvolution(planned);
        if (applied.soul.length > 0) {
            statusMessages.push({ role: 'status', content: 'SOUL updated' });
        }
    }
    const response = await chat(updated, config, signal);
    return {
        transcript: [...updated, ...statusMessages, { role: 'ai', content: response }],
    };
}
