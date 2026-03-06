import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { configDir } from './configManager.js';
const codexAuthFile = path.join(process.env['HOME'], '.codex', 'auth.json');
const minichatAuthFile = path.join(configDir, 'auth.json');
export function readCodexApiKey() {
    try {
        const parsed = JSON.parse(fs.readFileSync(codexAuthFile, 'utf8'));
        const apiKey = parsed.OPENAI_API_KEY?.trim();
        return apiKey || null;
    }
    catch {
        return null;
    }
}
export function saveMinichatCodexAuth(method) {
    try {
        const parsed = JSON.parse(fs.readFileSync(codexAuthFile, 'utf8'));
        const tokens = parsed.tokens;
        if (!tokens?.access_token ||
            !tokens.refresh_token ||
            !tokens.id_token ||
            !tokens.account_id) {
            return false;
        }
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        const auth = {
            authMode: method,
            lastRefresh: parsed.last_refresh ?? null,
            tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                id_token: tokens.id_token,
                account_id: tokens.account_id,
            },
        };
        fs.writeFileSync(minichatAuthFile, JSON.stringify(auth, null, 2));
        return true;
    }
    catch {
        return false;
    }
}
export function hasMinichatCodexAuth() {
    try {
        if (!fs.existsSync(minichatAuthFile))
            return false;
        const parsed = JSON.parse(fs.readFileSync(minichatAuthFile, 'utf8'));
        return Boolean(parsed.tokens?.access_token && parsed.tokens?.refresh_token);
    }
    catch {
        return false;
    }
}
export async function runCodexLogin(method) {
    const args = method === 'device' ? ['login', '--device-auth'] : ['login'];
    return await new Promise((resolve, reject) => {
        const child = spawn('codex', args, {
            stdio: 'inherit',
            env: process.env,
        });
        child.once('error', reject);
        child.once('exit', (code) => resolve(code ?? 1));
    });
}
function buildCodexPrompt(messages, systemPrompt) {
    const sections = [];
    if (systemPrompt.trim()) {
        sections.push([
            'System instructions:',
            systemPrompt.trim(),
        ].join('\n'));
    }
    sections.push('Conversation so far:');
    for (const message of messages) {
        sections.push(`${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`);
    }
    sections.push('Reply as the assistant to the last user message only.');
    sections.push('Do not include role labels.');
    return sections.join('\n\n');
}
export async function chatWithCodexAuth(messages, model, systemPrompt) {
    const prompt = buildCodexPrompt(messages, systemPrompt);
    const args = [
        'exec',
        '--json',
        '--skip-git-repo-check',
        '--sandbox',
        'read-only',
        '--color',
        'never',
    ];
    if (model) {
        args.push('--model', model);
    }
    args.push('-');
    return await new Promise((resolve, reject) => {
        const child = spawn('codex', args, {
            cwd: process.cwd(),
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            stdout += chunk;
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk;
        });
        child.once('error', reject);
        child.once('close', (code) => {
            if (code !== 0) {
                reject(new Error(stderr.trim() || `codex exec failed with exit code ${code}`));
                return;
            }
            const lines = stdout
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean);
            for (let index = lines.length - 1; index >= 0; index -= 1) {
                try {
                    const event = JSON.parse(lines[index]);
                    if (event.type === 'item.completed' && event.item?.type === 'agent_message' && event.item.text) {
                        resolve(event.item.text);
                        return;
                    }
                }
                catch { }
            }
            reject(new Error('Codex exec completed without an assistant message'));
        });
        child.stdin.end(prompt + os.EOL);
    });
}
