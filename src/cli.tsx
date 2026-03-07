#!/usr/bin/env node
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { App } from './components/App.js';
import { DeviceCodeScreen } from './components/DeviceCodeScreen.js';
import { SetupScreen, type SetupAction } from './components/SetupScreen.js';
import { getConfig, saveConfig } from './core/configManager.js';
import { readCodexApiKey, runCodexDeviceLogin, runCodexLogin, saveMinichatCodexAuth } from './core/codexAuth.js';

const require = createRequire(import.meta.url);

type InkInstance = {
  lastOutput?: string;
  lastOutputToRender?: string;
  lastOutputHeight?: number;
  fullStaticOutput?: string;
  throttledOnRender?: { cancel?: () => void };
  throttledLog?: { cancel?: () => void };
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
    enterAlternateScreen();

    const action = await new Promise<SetupAction>((resolve) => {
      const { unmount, cleanup } = render(
        <SetupScreen
          onDone={(nextAction) => {
            unmount();
            cleanup();
            resolve(nextAction);
          }}
        />
      );
    }).finally(() => {
      exitAlternateScreen();
    });

    process.stdout.write('\x1Bc');

    if (action.type === 'apiKey') {
      saveOpenAIConfig(action.apiKey);
      break;
    }

    if (action.type === 'device') {
      enterAlternateScreen();

      let verificationUri = 'Requesting device code...';
      let userCode = '...';
      const screen = render(
        <DeviceCodeScreen verificationUri={verificationUri} userCode={userCode} />
      );

      let exitCode = 1;

      try {
        exitCode = await runCodexDeviceLogin((update) => {
          if (update.verificationUri) {
            verificationUri = update.verificationUri;
          }

          if (update.userCode) {
            userCode = update.userCode;
          }

          screen.rerender(
            <DeviceCodeScreen
              verificationUri={verificationUri}
              userCode={userCode}
            />
          );
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Failed to launch Codex device login: ${message}\n`);
      } finally {
        screen.unmount();
        screen.cleanup();
        exitAlternateScreen();
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

    let exitCode = 1;

    try {
      enterAlternateScreen();
      exitCode = await runCodexLogin(action.type);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Failed to launch Codex login: ${message}\n`);
    } finally {
      exitAlternateScreen();
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

    if (instance) {
      instance.throttledOnRender?.cancel?.();
      instance.throttledLog?.cancel?.();
      instance.lastOutput = '';
      instance.lastOutputToRender = '';
      instance.lastOutputHeight = 0;
      instance.fullStaticOutput = '';
    }

    exitAlternateScreen();
    enterAlternateScreen();
    app.clear();
  };

  process.stdout.prependListener('resize', handleResize);

  app.waitUntilExit().finally(() => {
    process.stdout.off('resize', handleResize);
    exitAlternateScreen();
  });
})();
