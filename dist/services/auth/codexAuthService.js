import { spawn } from 'node:child_process';
import os from 'node:os';
import { clearImportedCodexAuth, readCodexApiKeyFromAuth, readCodexAuthFile, readImportedCodexAuth, writeImportedCodexAuth, } from '../storage/authStore.js';
const FILTERED_LOGIN_LINES = [
    'On a remote or headless machine? Use `codex login --device-auth` instead.',
];
const ANSI_ESCAPE_PATTERN = /\x1B\[[0-9;?]*[ -/]*[@-~]/g;
function importAuthFromCodexFile(method, parsed) {
    const tokens = parsed.tokens;
    if (!tokens?.access_token || !tokens.refresh_token || !tokens.id_token || !tokens.account_id) {
        return false;
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
    writeImportedCodexAuth(method, auth);
    return true;
}
export function readCodexApiKey() {
    return readCodexApiKeyFromAuth();
}
export function saveMinichatCodexAuth(method) {
    const parsed = readCodexAuthFile();
    if (!parsed) {
        return false;
    }
    return importAuthFromCodexFile(method, parsed);
}
export function hasMinichatCodexAuth() {
    return Boolean(readImportedCodexAuth());
}
export function clearMinichatCodexAuth() {
    clearImportedCodexAuth();
}
export async function runCodexLogout() {
    await new Promise((resolve) => {
        const child = spawn('codex', ['logout'], {
            stdio: ['ignore', 'ignore', 'ignore'],
            env: process.env,
        });
        child.once('error', () => resolve());
        child.once('close', () => resolve());
    });
}
export async function runCodexLogin(method) {
    const args = method === 'device' ? ['login', '--device-auth'] : ['login'];
    return await new Promise((resolve, reject) => {
        const filterBrowserLoginOutput = method === 'chatgpt';
        const child = spawn('codex', args, {
            stdio: filterBrowserLoginOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
            env: process.env,
        });
        if (!filterBrowserLoginOutput) {
            child.once('error', reject);
            child.once('exit', (code) => resolve(code ?? 1));
            return;
        }
        let stderr = '';
        let stdoutBuffer = '';
        let stderrBuffer = '';
        const flushFilteredLines = (chunk, target, isStderr) => {
            const buffer = (isStderr ? stderrBuffer : stdoutBuffer) + chunk;
            const lines = buffer.split(/\r?\n/);
            const remainder = lines.pop() ?? '';
            for (const line of lines) {
                if (FILTERED_LOGIN_LINES.includes(line.trim())) {
                    continue;
                }
                target.write(`${line}\n`);
            }
            return remainder;
        };
        child.stdout?.setEncoding('utf8');
        child.stdout?.on('data', (chunk) => {
            stdoutBuffer = flushFilteredLines(chunk, process.stdout, false);
        });
        child.stderr?.setEncoding('utf8');
        child.stderr?.on('data', (chunk) => {
            stderr += chunk;
            stderrBuffer = flushFilteredLines(chunk, process.stderr, true);
        });
        child.once('exit', (code) => {
            if (stdoutBuffer.trim() && !FILTERED_LOGIN_LINES.includes(stdoutBuffer.trim())) {
                process.stdout.write(stdoutBuffer);
            }
            if (stderrBuffer.trim() && !FILTERED_LOGIN_LINES.includes(stderrBuffer.trim())) {
                process.stderr.write(stderrBuffer);
            }
            if ((code ?? 1) !== 0 && stderr.trim()) {
                reject(new Error(stderr.trim()));
                return;
            }
            resolve(code ?? 1);
        });
        child.once('error', reject);
    });
}
export async function runCodexDeviceLogin(onUpdate) {
    return await new Promise((resolve, reject) => {
        const child = spawn('codex', ['login', '--device-auth'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            env: process.env,
        });
        let stderr = '';
        let stdoutBuffer = '';
        let stderrBuffer = '';
        const stripAnsi = (value) => value.replace(ANSI_ESCAPE_PATTERN, '');
        const flushLines = (chunk, isStderr) => {
            const buffer = (isStderr ? stderrBuffer : stdoutBuffer) + chunk;
            const lines = buffer.split(/\r?\n/);
            const remainder = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = stripAnsi(line).trim();
                if (trimmed.startsWith('http')) {
                    onUpdate({ verificationUri: trimmed });
                    continue;
                }
                if (/^[A-Z0-9]{4,}-[A-Z0-9-]+$/.test(trimmed)) {
                    onUpdate({ userCode: trimmed });
                    continue;
                }
                if (isStderr) {
                    stderr += `${line}\n`;
                }
            }
            return remainder;
        };
        child.stdout?.setEncoding('utf8');
        child.stdout?.on('data', (chunk) => {
            stdoutBuffer = flushLines(chunk, false);
        });
        child.stderr?.setEncoding('utf8');
        child.stderr?.on('data', (chunk) => {
            stderrBuffer = flushLines(chunk, true);
        });
        child.once('error', reject);
        child.once('close', (code) => {
            const finalStdout = stripAnsi(stdoutBuffer).trim();
            const finalStderr = stripAnsi(stderrBuffer).trim();
            if (finalStdout.startsWith('http')) {
                onUpdate({ verificationUri: finalStdout });
            }
            else if (/^[A-Z0-9]{4,}-[A-Z0-9-]+$/.test(finalStdout)) {
                onUpdate({ userCode: finalStdout });
            }
            if (code !== 0) {
                reject(new Error(finalStderr || stderr.trim() || `codex login --device-auth failed with exit code ${code}`));
                return;
            }
            resolve(code ?? 0);
        });
    });
}
function buildCodexPrompt(messages, systemPrompt) {
    const sections = [];
    if (systemPrompt.trim()) {
        sections.push(['System instructions:', systemPrompt.trim()].join('\n'));
    }
    sections.push('Conversation so far:');
    for (const message of messages) {
        if (message.role === 'status') {
            continue;
        }
        sections.push(`${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`);
    }
    sections.push('Reply as the assistant to the last user message only.');
    sections.push('Do not include role labels.');
    return sections.join('\n\n');
}
export async function chatWithCodexAuth(messages, model, reasoningEffort, systemPrompt, signal) {
    const prompt = buildCodexPrompt(messages, systemPrompt);
    const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never'];
    if (model) {
        args.push('--model', model);
    }
    if (reasoningEffort) {
        args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
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
        const abortHandler = () => {
            child.kill('SIGTERM');
            reject(new Error('Request interrupted'));
        };
        if (signal) {
            if (signal.aborted) {
                abortHandler();
                return;
            }
            signal.addEventListener('abort', abortHandler, { once: true });
        }
        child.once('error', reject);
        child.once('close', (code) => {
            if (signal) {
                signal.removeEventListener('abort', abortHandler);
            }
            if (signal?.aborted) {
                return;
            }
            if (code !== 0) {
                reject(new Error(stderr.trim() || `codex exec failed with exit code ${code}`));
                return;
            }
            const lines = stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter(Boolean);
            for (let index = lines.length - 1; index >= 0; index -= 1) {
                try {
                    const event = JSON.parse(lines[index]);
                    if (typeof event.content === 'string' && event.content.trim()) {
                        resolve(event.content.trim());
                        return;
                    }
                    if (typeof event.delta === 'string' && event.delta.trim()) {
                        resolve(event.delta.trim());
                        return;
                    }
                    if (typeof event.summary === 'string' && event.summary.trim()) {
                        resolve(event.summary.trim());
                        return;
                    }
                }
                catch { }
            }
            resolve(stdout.trim());
        });
        child.stdin.end(`${prompt}${os.EOL}`);
    });
}
