import { analyzeContextEvolution, applyContextEvolution } from '../../core/contextEvolution.js';
import { chat } from '../../core/openaiClient.js';
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
