import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { configDir } from './configManager.js';
import type { ChatMessage } from './chatManager.js';

const codexAuthFile = path.join(process.env['HOME']!, '.codex', 'auth.json');
const minichatAuthFile = path.join(configDir, 'auth.json');
const FILTERED_LOGIN_LINES = [
  'On a remote or headless machine? Use `codex login --device-auth` instead.',
];
const ANSI_ESCAPE_PATTERN = /\x1B\[[0-9;?]*[ -/]*[@-~]/g;

type LoginMethod = 'chatgpt' | 'device';
type DeviceLoginUpdate = {
  verificationUri?: string;
  userCode?: string;
};

interface CodexAuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  account_id: string;
}

interface CodexAuthFile {
  auth_mode?: 'chatgpt' | 'device_code' | string;
  last_refresh?: string;
  OPENAI_API_KEY?: string | null;
  tokens?: Partial<CodexAuthTokens>;
}

interface MinichatAuthFile {
  authMode: 'chatgpt' | 'device';
  lastRefresh: string | null;
  tokens: CodexAuthTokens;
}

export function readCodexApiKey(): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(codexAuthFile, 'utf8')) as CodexAuthFile;
    const apiKey = parsed.OPENAI_API_KEY?.trim();
    return apiKey || null;
  } catch {
    return null;
  }
}

export function saveMinichatCodexAuth(method: LoginMethod): boolean {
  try {
    const parsed = JSON.parse(fs.readFileSync(codexAuthFile, 'utf8')) as CodexAuthFile;
    const tokens = parsed.tokens;

    if (
      !tokens?.access_token ||
      !tokens.refresh_token ||
      !tokens.id_token ||
      !tokens.account_id
    ) {
      return false;
    }

    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const auth: MinichatAuthFile = {
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
  } catch {
    return false;
  }
}

export function hasMinichatCodexAuth(): boolean {
  try {
    if (!fs.existsSync(minichatAuthFile)) return false;
    const parsed = JSON.parse(fs.readFileSync(minichatAuthFile, 'utf8')) as Partial<MinichatAuthFile>;
    return Boolean(parsed.tokens?.access_token && parsed.tokens?.refresh_token);
  } catch {
    return false;
  }
}

export function clearMinichatCodexAuth(): void {
  try {
    if (fs.existsSync(minichatAuthFile)) {
      fs.unlinkSync(minichatAuthFile);
    }
  } catch {}
}

export async function runCodexLogout(): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn('codex', ['logout'], {
      stdio: ['ignore', 'ignore', 'ignore'],
      env: process.env,
    });

    child.once('error', () => resolve());
    child.once('close', () => resolve());
  });
}

export async function runCodexLogin(method: LoginMethod): Promise<number> {
  const args = method === 'device' ? ['login', '--device-auth'] : ['login'];

  return await new Promise<number>((resolve, reject) => {
    const filterBrowserLoginOutput = method === 'chatgpt';
    const child = spawn('codex', args, {
      stdio: filterBrowserLoginOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      env: process.env,
    });

    if (filterBrowserLoginOutput) {
      let stderr = '';
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const flushFilteredLines = (chunk: string, target: NodeJS.WriteStream, isStderr: boolean): string => {
        const buffer = (isStderr ? stderrBuffer : stdoutBuffer) + chunk;
        const lines = buffer.split(/\r?\n/);
        const remainder = lines.pop() ?? '';

        for (const line of lines) {
          if (FILTERED_LOGIN_LINES.includes(line.trim())) {
            continue;
          }

          target.write(line + '\n');
        }

        return remainder;
      };

      child.stdout?.setEncoding('utf8');
      child.stdout?.on('data', (chunk: string) => {
        stdoutBuffer = flushFilteredLines(chunk, process.stdout, false);
      });

      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', (chunk: string) => {
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
      return;
    }

    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
}

export async function runCodexDeviceLogin(
  onUpdate: (update: DeviceLoginUpdate) => void,
): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const child = spawn('codex', ['login', '--device-auth'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stderr = '';
    let stdoutBuffer = '';
    let stderrBuffer = '';

    const stripAnsi = (value: string) => value.replace(ANSI_ESCAPE_PATTERN, '');

    const flushLines = (chunk: string, isStderr: boolean): string => {
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
          stderr += line + '\n';
        }
      }

      return remainder;
    };

    child.stdout?.setEncoding('utf8');
    child.stdout?.on('data', (chunk: string) => {
      stdoutBuffer = flushLines(chunk, false);
    });

    child.stderr?.setEncoding('utf8');
    child.stderr?.on('data', (chunk: string) => {
      stderrBuffer = flushLines(chunk, true);
    });

    child.once('error', reject);
    child.once('close', (code) => {
      const finalStdout = stripAnsi(stdoutBuffer).trim();
      const finalStderr = stripAnsi(stderrBuffer).trim();

      if (finalStdout.startsWith('http')) {
        onUpdate({ verificationUri: finalStdout });
      } else if (/^[A-Z0-9]{4,}-[A-Z0-9-]+$/.test(finalStdout)) {
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

function buildCodexPrompt(messages: ChatMessage[], systemPrompt: string): string {
  const sections: string[] = [];

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

export async function chatWithCodexAuth(
  messages: ChatMessage[],
  model: string | undefined,
  systemPrompt: string,
): Promise<string> {
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

  return await new Promise<string>((resolve, reject) => {
    const child = spawn('codex', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk: string) => {
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
          const event = JSON.parse(lines[index]) as {
            type?: string;
            item?: { type?: string; text?: string };
          };

          if (event.type === 'item.completed' && event.item?.type === 'agent_message' && event.item.text) {
            resolve(event.item.text);
            return;
          }
        } catch {}
      }

      reject(new Error('Codex exec completed without an assistant message'));
    });

    child.stdin.end(prompt + os.EOL);
  });
}
