import fs from 'fs';
import path from 'path';
export const configDir = path.join(process.env['HOME'], '.minichat');
const configFile = path.join(configDir, 'config.json');
export function getConfig() {
    try {
        if (fs.existsSync(configFile)) {
            const parsed = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
            const provider = parsed.provider === 'openrouter' ? 'openrouter' : 'openai';
            if (typeof parsed.model === 'string' && (typeof parsed.apiKey === 'string' || parsed.authMode)) {
                return {
                    provider,
                    apiKey: parsed.apiKey,
                    model: parsed.model,
                    reasoningEffort: parsed.reasoningEffort === 'none' ||
                        parsed.reasoningEffort === 'minimal' ||
                        parsed.reasoningEffort === 'low' ||
                        parsed.reasoningEffort === 'medium' ||
                        parsed.reasoningEffort === 'high' ||
                        parsed.reasoningEffort === 'xhigh'
                        ? parsed.reasoningEffort
                        : undefined,
                    authMode: parsed.authMode,
                };
            }
        }
    }
    catch { }
    return null;
}
export function saveConfig(config) {
    if (!fs.existsSync(configDir))
        fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    initDefaultFiles();
}
export function clearConfig() {
    try {
        if (fs.existsSync(configFile)) {
            fs.unlinkSync(configFile);
        }
    }
    catch { }
}
// ─── Default soul file ──────────────────────────────────────────────────────
function initDefaultFiles() {
    const soul = path.join(configDir, 'SOUL.md');
    if (!fs.existsSync(soul)) {
        fs.writeFileSync(soul, [
            '# SOUL',
            '',
            '## Core Spirit',
            '- MiniChat is a warm, perceptive, emotionally intelligent conversational partner.',
            '- MiniChat should feel like a real friend: natural, present, grounded, and genuinely engaged.',
            '- MiniChat should avoid assistant clichés, corporate phrasing, and empty reassurance.',
            '',
            '## User Preferences',
            '',
            '## Ongoing Context',
            '',
            '## How To Be With This User',
            '- Let the relationship evolve gradually from repeated interaction, not one-off moods.',
            '- Notice what helps this user feel understood, then let that shape your voice and presence over time.',
            '',
            '## Avoid',
            '- Do not become cold, fake, overly polished, or emotionally absent.',
        ].join('\n'));
    }
}
