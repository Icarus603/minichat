import { appendSoulEntries, readSoulText } from './contextFiles.js';
import { runBackgroundPrompt } from './openaiClient.js';
const validSections = [
    'Core Spirit',
    'User Preferences',
    'Ongoing Context',
    'How To Be With This User',
    'Avoid',
];
function isSoulSection(value) {
    return validSections.includes(value);
}
function extractJsonObject(raw) {
    const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
        return raw.slice(start, end + 1);
    }
    return raw.trim();
}
function parseEvolutionResult(raw) {
    try {
        const parsed = JSON.parse(extractJsonObject(raw));
        const soul = Array.isArray(parsed.soul)
            ? parsed.soul
                .filter((item) => Boolean(item && typeof item === 'object'))
                .filter((item) => Boolean(typeof item.note === 'string' &&
                typeof item.section === 'string' &&
                isSoulSection(item.section)))
            : [];
        return { soul };
    }
    catch {
        return { soul: [] };
    }
}
function buildConversationSnippet(messages) {
    return messages
        .slice(-6)
        .filter(message => message.role !== 'status')
        .map(message => `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`)
        .join('\n');
}
function getLatestUserMessage(messages) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index];
        if (message.role === 'user') {
            return message.content.trim();
        }
    }
    return '';
}
const highConfidencePatterns = [
    /記住/,
    /记住/,
    /我希望你/,
    /我想讓你/,
    /我想让你/,
    /你以後/,
    /你以后/,
    /以後跟我說話/,
    /以后跟我说话/,
    /我喜歡/,
    /我喜欢/,
    /我不喜歡/,
    /我不喜欢/,
    /不要再/,
    /別再/,
    /别再/,
    /你應該/,
    /你应该/,
    /請用/,
    /请用/,
    /我正在做/,
    /我在做/,
    /我是/,
    /我的工作/,
    /我的項目/,
    /我的项目/,
];
export function shouldConsiderSoulSync(messages) {
    const latest = getLatestUserMessage(messages);
    if (!latest) {
        return false;
    }
    if (latest.length < 6) {
        return false;
    }
    return highConfidencePatterns.some(pattern => pattern.test(latest));
}
function parseGateResult(raw) {
    try {
        const parsed = JSON.parse(extractJsonObject(raw));
        return { shouldAnalyze: parsed.should_analyze === true };
    }
    catch {
        return { shouldAnalyze: false };
    }
}
function buildGatePrompt(messages, soulText) {
    const conversation = buildConversationSnippet(messages);
    const existingSoul = soulText.trim() || '(empty)';
    return [
        'You are deciding whether MiniChat should do a synchronous SOUL.md analysis before replying.',
        'Be extremely conservative.',
        'Return strict JSON only with this exact shape:',
        '{"should_analyze":true}',
        '',
        'Say true only if the latest user message very likely contains durable information worth storing in SOUL.md right now.',
        'Examples that may justify true:',
        '- explicit long-term preferences about how MiniChat should speak',
        '- explicit requests to remember something durable',
        '- durable background or ongoing context likely to matter later',
        '- clear instructions about how MiniChat should relate to the user over time',
        '',
        'Say false for:',
        '- ordinary chat',
        '- one-off requests',
        '- transient moods',
        '- short reactions',
        '- generic questions',
        '',
        'Existing SOUL:',
        existingSoul,
        '',
        'Latest conversation snippet:',
        conversation,
    ].join('\n');
}
function buildEvolutionPrompt(messages, soulText) {
    const conversation = buildConversationSnippet(messages);
    const existingSoul = soulText.trim() || '(empty)';
    return [
        'You are maintaining MiniChat SOUL.md after a conversation turn.',
        'Decide whether the latest conversation reveals anything stable enough to persist.',
        'Return strict JSON only with this exact shape:',
        '{"soul":[{"section":"User Preferences","note":"..."}]}',
        '',
        'Valid sections:',
        '- Core Spirit',
        '- User Preferences',
        '- Ongoing Context',
        '- How To Be With This User',
        '- Avoid',
        '',
        'Section meanings:',
        '- User Preferences: stable user tastes, communication preferences, explicit likes/dislikes.',
        '- Ongoing Context: durable project or life context likely to matter later.',
        '- How To Be With This User: how MiniChat should respond, sound, or show up for this user over time.',
        '- Avoid: patterns MiniChat should avoid with this user.',
        '- Core Spirit: only for very high-level identity rules; use rarely.',
        '',
        'Rules:',
        '- Be conservative. Most turns should produce no update at all.',
        '- Only save durable things. Ignore transient moods, one-off requests, and generic chat filler.',
        '- A single casual sentence should usually not be saved unless it clearly states a lasting preference or ongoing context.',
        '- If the same user statement is both a preference and a style-shaping instruction, prefer writing two entries only when both are truly useful and distinct.',
        '- Avoid duplicates or near-duplicates of what is already in SOUL.md.',
        '- Keep each note short, specific, and append-ready as a single bullet.',
        '- If nothing should be saved, return {"soul":[]}.',
        '- At most 2 entries total.',
        '',
        'Existing SOUL:',
        existingSoul,
        '',
        'Latest conversation snippet:',
        conversation,
    ].join('\n');
}
export async function analyzeContextEvolution(messages, config, signal) {
    const prompt = buildEvolutionPrompt(messages, readSoulText());
    const raw = await runBackgroundPrompt(prompt, config, signal);
    return parseEvolutionResult(raw);
}
export async function shouldAnalyzeContextEvolution(messages, config, signal) {
    if (!shouldConsiderSoulSync(messages)) {
        return false;
    }
    const prompt = buildGatePrompt(messages, readSoulText());
    const raw = await runBackgroundPrompt(prompt, config, signal);
    return parseGateResult(raw).shouldAnalyze;
}
export function applyContextEvolution(result) {
    return {
        soul: appendSoulEntries(result.soul),
    };
}
