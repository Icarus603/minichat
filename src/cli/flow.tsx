import React from 'react';
import { render } from 'ink';
import { App } from '../tui/App.js';
import { DeviceCodeScreen } from '../tui/components/DeviceCodeScreen.js';
import { ResumeModal } from '../tui/components/ResumeModal.js';
import { SetupScreen, type SetupAction } from '../tui/components/SetupScreen.js';
import { UpdateScreen } from '../tui/components/UpdateScreen.js';
import { clearLoginState, getImportedCodexApiKey, importCodexAuth, saveChatGPTConfig, saveDeepSeekConfig, saveOpenAIConfig, saveOpenRouterConfig } from '../app/controller/authController.js';
import { loadSession } from '../app/controller/sessionController.js';
import { checkForUpdate, installLatestUpdate } from '../services/updater/updateService.js';
import { runCodexDeviceLogin, runCodexLogin } from '../services/auth/codexAuthService.js';
import { enterAlternateScreen, exitAlternateScreen, hardResetTerminal } from './terminal.js';

export async function runSetupFlow(getConfig: () => unknown) {
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
        />,
      );
    }).finally(() => {
      exitAlternateScreen();
    });

    hardResetTerminal();

    if (action.type === 'openaiApiKey') {
      saveOpenAIConfig(action.apiKey);
      break;
    }
    if (action.type === 'openrouterApiKey') {
      saveOpenRouterConfig(action.apiKey);
      break;
    }
    if (action.type === 'deepseekApiKey') {
      saveDeepSeekConfig(action.apiKey, action.model);
      break;
    }

    if (action.type === 'device') {
      enterAlternateScreen();

      let verificationUri = 'Requesting device code...';
      let userCode = '...';
      const screen = render(<DeviceCodeScreen verificationUri={verificationUri} userCode={userCode} />);
      let exitCode = 1;

      try {
        exitCode = await runCodexDeviceLogin((update) => {
          if (update.verificationUri) verificationUri = update.verificationUri;
          if (update.userCode) userCode = update.userCode;
          screen.rerender(<DeviceCodeScreen verificationUri={verificationUri} userCode={userCode} />);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Failed to launch Codex device login: ${message}\n`);
      } finally {
        screen.unmount();
        screen.cleanup();
        exitAlternateScreen();
      }

      hardResetTerminal();
      if (exitCode !== 0) continue;

      const apiKey = getImportedCodexApiKey();
      if (apiKey) {
        saveOpenAIConfig(apiKey);
        break;
      }
      if (!importCodexAuth(action.type)) {
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

    hardResetTerminal();
    if (exitCode !== 0) continue;

    const apiKey = getImportedCodexApiKey();
    if (apiKey) {
      saveOpenAIConfig(apiKey);
      break;
    }
    if (!importCodexAuth(action.type)) {
      process.stderr.write('Codex login completed, but MiniChat could not import auth tokens from ~/.codex/auth.json\n');
      continue;
    }
    saveChatGPTConfig(action.type);
    break;
  }
}

export async function runResumePickerFlow(): Promise<string | null> {
  enterAlternateScreen();
  const selectedId = await new Promise<string | null>((resolve) => {
    const { unmount, cleanup } = render(
      <ResumeModal
        onSelect={(transcriptId) => {
          unmount();
          cleanup();
          resolve(transcriptId);
        }}
      />,
    );
  }).finally(() => {
    exitAlternateScreen();
  });

  hardResetTerminal();
  return selectedId;
}

export async function runUpdatePromptFlow(): Promise<'skip' | 'updated'> {
  if (!process.stdout.isTTY) {
    return 'skip';
  }

  const update = await checkForUpdate();
  if (!update) {
    return 'skip';
  }

  enterAlternateScreen();
  const action = await new Promise<'skip' | 'updated'>((resolve) => {
    const { unmount, cleanup } = render(
      <UpdateScreen
        update={update}
        onInstall={installLatestUpdate}
        onDone={(nextAction) => {
          unmount();
          cleanup();
          resolve(nextAction);
        }}
      />,
    );
  }).finally(() => {
    exitAlternateScreen();
  });

  hardResetTerminal();
  return action;
}

export async function runChatAppFlow(sessionId: string) {
  enterAlternateScreen();
  const renderTree = () => (
    <App
      sessionId={sessionId}
      initialTranscript={loadSession(sessionId)}
      onAuthAction={(action) => {
        resolveAuthAction?.(action);
      }}
    />
  );
  let resolveAuthAction: ((action: 'login' | 'logout') => void) | null = null;
  const authActionPromise = new Promise<'login' | 'logout'>((resolve) => {
    resolveAuthAction = resolve;
  });
  const app = render(renderTree());
  try {
    return await Promise.race([
      authActionPromise,
      app.waitUntilExit().then(() => 'exit' as const),
    ]);
  } finally {
    app.unmount();
    app.cleanup();
    exitAlternateScreen();
    hardResetTerminal();
  }
}

export { clearLoginState };
