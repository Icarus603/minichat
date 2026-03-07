import { spawn } from 'node:child_process';
import os from 'node:os';
import type { ChatMessage } from '../../core/chatManager.js';
import {
  clearImportedCodexAuth,
  readCodexApiKeyFromAuth,
  readCodexAuthFile,
  readImportedCodexAuth,
  writeImportedCodexAuth,
  type CodexAuthFile,
  type LoginMethod,
  type MinichatAuthFile,
} from '../storage/authStore.js';

const FILTERED_LOGIN_LINES = [
  'On a remote or headless machine? Use `codex login --device-auth` instead.',
];
const ANSI_ESCAPE_PATTERN = /\x1B\[[0-9;?]*[ -/]*[@-~]/g;

export type DeviceLoginUpdate = {
  verificationUri?: string;
  userCode?: string;
};

function importAuthFromCodexFile(method: LoginMethod, parsed: CodexAuthFile): boolean {
  const tokens = parsed.tokens;
  if (!tokens?.access_token || !tokens.refresh_token || !tokens.id_token || !tokens.account_id) {
    return false;
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

  writeImportedCodexAuth(method, auth);
  return true;
}

export function readCodexApiKey(): string | null {
  return readCodexApiKeyFromAuth();
}

export function saveMinichatCodexAuth(method: LoginMethod): boolean {
  const parsed = readCodexAuthFile();
  if (!parsed) {
    return false;
  }

  return importAuthFromCodexFile(method, parsed);
}

export function hasMinichatCodexAuth(): boolean {
  return Boolean(readImportedCodexAuth());
}

export function clearMinichatCodexAuth(): void {
  clearImportedCodexAuth();
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

    if (!filterBrowserLoginOutput) {
      child.once('error', reject);
      child.once('exit', (code) => resolve(code ?? 1));
      return;
    }

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
        target.write(`${line}\n`);
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
          stderr += `${line}\n`;
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

export function parseCodexExecJsonOutput(stdout: string): string {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let sawJsonEvent = false;
  const assistantTexts: string[] = [];
  const rawTextLines: string[] = [];

  for (const line of lines) {
    try {
      const event = JSON.parse(line) as {
        type?: string;
        content?: string;
        delta?: string;
        summary?: string;
        item?: {
          type?: string;
          text?: string;
          content?: Array<{ type?: string; text?: string }>;
        };
      };

      sawJsonEvent = true;

      if (typeof event.content === 'string' && event.content.trim()) {
        assistantTexts.push(event.content.trim());
        continue;
      }

      if (typeof event.delta === 'string' && event.delta.trim()) {
        assistantTexts.push(event.delta.trim());
        continue;
      }

      if (typeof event.summary === 'string' && event.summary.trim()) {
        assistantTexts.push(event.summary.trim());
        continue;
      }

      if (
        event.type === 'item.completed' &&
        event.item?.type === 'agent_message' &&
        typeof event.item.text === 'string' &&
        event.item.text.trim()
      ) {
        assistantTexts.push(event.item.text.trim());
        continue;
      }

      if (
        event.item?.type === 'agent_message' &&
        Array.isArray(event.item.content)
      ) {
        const contentText = event.item.content
          .map((content) => typeof content.text === 'string' ? content.text.trim() : '')
          .filter(Boolean)
          .join('\n')
          .trim();

        if (contentText) {
          assistantTexts.push(contentText);
        }
      }
    } catch {
      rawTextLines.push(line);
    }
  }

  if (assistantTexts.length > 0) {
    return assistantTexts.join('\n').trim();
  }

  if (rawTextLines.length > 0) {
    return rawTextLines.join('\n').trim();
  }

  if (sawJsonEvent) {
    throw new Error('codex exec returned JSON events but no assistant message text');
  }

  return stdout.trim();
}

export async function chatWithCodexAuth(
  messages: ChatMessage[],
  model: string | undefined,
  reasoningEffort: string | undefined,
  systemPrompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const prompt = buildCodexPrompt(messages, systemPrompt);
  const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only', '--color', 'never'];

  if (model) {
    args.push('--model', model);
  }
  if (reasoningEffort) {
    args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
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

      try {
        resolve(parseCodexExecJsonOutput(stdout));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    child.stdin.end(`${prompt}${os.EOL}`);
  });
}
