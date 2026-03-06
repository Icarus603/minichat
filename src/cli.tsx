#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { App } from './components/App.js';
import { SetupScreen, type SetupAction } from './components/SetupScreen.js';
import { getConfig, saveConfig } from './core/configManager.js';
import { readCodexApiKey, runCodexLogin, saveMinichatCodexAuth } from './core/codexAuth.js';

const require = createRequire(import.meta.url);

type InkInstance = {
  lastOutput?: string;
  clear: () => void;
};

const loadInkInstances = async () => {
  const inkEntry = require.resolve('ink');
  const inkBuildDir = dirname(inkEntry);
  const instancesUrl = pathToFileURL(join(inkBuildDir, 'instances.js')).href;
  const module = (await import(instancesUrl)) as {
    default: Map<NodeJS.WriteStream, InkInstance>;
  };

  return module.default;
};

const enterAlternateScreen = () => {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\x1B[?1049h\x1B[2J\x1B[H');
};

const exitAlternateScreen = () => {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\x1B[?1049l');
};

const saveOpenAIConfig = (apiKey: string) => {
  saveConfig({
    apiKey,
    model: 'gpt-4.1',
    authMode: 'apiKey',
  });
};

const saveChatGPTConfig = (method: 'chatgpt' | 'device') => {
  saveConfig({
    model: 'gpt-5.4',
    authMode: method,
  });
};

const runSetup = async () => {
  while (!getConfig()) {
    const action = await new Promise<SetupAction>((resolve) => {
      const { unmount } = render(
        <SetupScreen
          onDone={(nextAction) => {
            unmount();
            resolve(nextAction);
          }}
        />
      );
    });

    process.stdout.write('\x1Bc');

    if (action.type === 'apiKey') {
      saveOpenAIConfig(action.apiKey);
      break;
    }

    let exitCode = 1;

    try {
      exitCode = await runCodexLogin(action.type);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Failed to launch Codex login: ${message}\n`);
    }

    process.stdout.write('\x1Bc');

    if (exitCode !== 0) {
      continue;
    }

    const apiKey = readCodexApiKey();
    if (apiKey) {
      saveOpenAIConfig(apiKey);
      break;
    }

    if (!saveMinichatCodexAuth(action.type)) {
      process.stderr.write('Codex login completed, but MiniChat could not import auth tokens from ~/.codex/auth.json\n');
      continue;
    }

    saveChatGPTConfig(action.type);
    break;
  }
};

(async () => {
  const argv = yargs(hideBin(process.argv))
    .option('resume', {
      type: 'boolean',
      desc: 'Resume a previous conversation',
      default: false,
    })
    .parseSync();

  // ── Page 1: Setup (only if no config saved) ───────────────────
  if (!getConfig()) {
    await runSetup();
    process.stdout.write('\x1Bc');
  }

  // ── Page 2: Main chat app ─────────────────────────────────────
  const resumeMode = Boolean(argv.resume);
  enterAlternateScreen();
  const app = render(<App resumeMode={resumeMode} />);
  const instances = await loadInkInstances();
  const instance = instances.get(process.stdout);
  let previousColumns = process.stdout.columns ?? 0;
  let previousRows = process.stdout.rows ?? 0;

  const handleResize = () => {
    const nextColumns = process.stdout.columns ?? previousColumns;
    const nextRows = process.stdout.rows ?? previousRows;
    const expanded = nextColumns > previousColumns || nextRows > previousRows;

    previousColumns = nextColumns;
    previousRows = nextRows;

    if (!expanded) return;
    if (instance) instance.lastOutput = '';
    app.clear();
    process.stdout.write('\x1B[2J\x1B[H');
  };

  process.stdout.prependListener('resize', handleResize);

  app.waitUntilExit().finally(() => {
    process.stdout.off('resize', handleResize);
    exitAlternateScreen();
  });
})();
