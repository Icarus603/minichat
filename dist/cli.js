#!/usr/bin/env node
import { jsx as _jsx } from "react/jsx-runtime";
import { render } from 'ink';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { App } from './components/App.js';
import { DeviceCodeScreen } from './components/DeviceCodeScreen.js';
import { ResumeModal } from './components/ResumeModal.js';
import { SetupScreen } from './components/SetupScreen.js';
import { UpdateScreen } from './components/UpdateScreen.js';
import { resolvePostChatAction } from './core/appFlow.js';
import { clearConfig, getConfig, saveConfig } from './core/configManager.js';
import { clearMinichatCodexAuth, readCodexApiKey, runCodexDeviceLogin, runCodexLogin, runCodexLogout, saveMinichatCodexAuth } from './core/codexAuth.js';
import { loadTranscript } from './core/transcriptManager.js';
import { checkForUpdate, installLatestUpdate } from './core/updater.js';
const enterAlternateScreen = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?1049h\x1B[2J\x1B[H');
};
const exitAlternateScreen = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?1049l');
};
const saveOpenAIConfig = (apiKey) => {
    saveConfig({
        provider: 'openai',
        apiKey,
        model: 'gpt-4.1',
        authMode: 'apiKey',
    });
};
const saveOpenRouterConfig = (apiKey) => {
    saveConfig({
        provider: 'openrouter',
        apiKey,
        model: 'openai/gpt-5.3-codex',
        authMode: 'apiKey',
    });
};
const saveChatGPTConfig = (method) => {
    saveConfig({
        provider: 'openai',
        model: 'gpt-5.4',
        authMode: method,
    });
};
const runSetup = async () => {
    while (!getConfig()) {
        enterAlternateScreen();
        const action = await new Promise((resolve) => {
            const { unmount, cleanup } = render(_jsx(SetupScreen, { onDone: (nextAction) => {
                    unmount();
                    cleanup();
                    resolve(nextAction);
                } }));
        }).finally(() => {
            exitAlternateScreen();
        });
        process.stdout.write('\x1Bc');
        if (action.type === 'openaiApiKey') {
            saveOpenAIConfig(action.apiKey);
            break;
        }
        if (action.type === 'openrouterApiKey') {
            saveOpenRouterConfig(action.apiKey);
            break;
        }
        if (action.type === 'device') {
            enterAlternateScreen();
            let verificationUri = 'Requesting device code...';
            let userCode = '...';
            const screen = render(_jsx(DeviceCodeScreen, { verificationUri: verificationUri, userCode: userCode }));
            let exitCode = 1;
            try {
                exitCode = await runCodexDeviceLogin((update) => {
                    if (update.verificationUri) {
                        verificationUri = update.verificationUri;
                    }
                    if (update.userCode) {
                        userCode = update.userCode;
                    }
                    screen.rerender(_jsx(DeviceCodeScreen, { verificationUri: verificationUri, userCode: userCode }));
                });
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                process.stderr.write(`Failed to launch Codex device login: ${message}\n`);
            }
            finally {
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            process.stderr.write(`Failed to launch Codex login: ${message}\n`);
        }
        finally {
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
const createSessionId = () => new Date().toISOString().replace(/[:.]/g, '-');
const runResumePicker = async () => {
    enterAlternateScreen();
    const selectedId = await new Promise((resolve) => {
        const { unmount, cleanup } = render(_jsx(ResumeModal, { onSelect: (transcriptId) => {
                unmount();
                cleanup();
                resolve(transcriptId);
            } }));
    }).finally(() => {
        exitAlternateScreen();
    });
    process.stdout.write('\x1Bc');
    return selectedId;
};
const runUpdatePrompt = async () => {
    if (!process.stdout.isTTY) {
        return 'skip';
    }
    const update = await checkForUpdate();
    if (!update) {
        return 'skip';
    }
    enterAlternateScreen();
    const action = await new Promise((resolve) => {
        const { unmount, cleanup } = render(_jsx(UpdateScreen, { update: update, onInstall: installLatestUpdate, onDone: (nextAction) => {
                unmount();
                cleanup();
                resolve(nextAction);
            } }));
    }).finally(() => {
        exitAlternateScreen();
    });
    process.stdout.write('\x1Bc');
    return action;
};
const clearLoginState = async () => {
    clearConfig();
    clearMinichatCodexAuth();
    await runCodexLogout();
};
const runChatApp = async (sessionId, initialTranscript = loadTranscript(sessionId)) => {
    enterAlternateScreen();
    let resolveAuthAction = null;
    const authActionPromise = new Promise((resolve) => {
        resolveAuthAction = resolve;
    });
    const app = render(_jsx(App, { sessionId: sessionId, initialTranscript: initialTranscript, onAuthAction: (action) => {
            resolveAuthAction?.(action);
        } }));
    let previousColumns = process.stdout.columns ?? 0;
    let previousRows = process.stdout.rows ?? 0;
    const handleResize = () => {
        const nextColumns = process.stdout.columns ?? previousColumns;
        const nextRows = process.stdout.rows ?? previousRows;
        const expanded = nextColumns > previousColumns || nextRows > previousRows;
        previousColumns = nextColumns;
        previousRows = nextRows;
        if (!expanded)
            return;
        exitAlternateScreen();
        enterAlternateScreen();
        app.clear();
    };
    process.stdout.prependListener('resize', handleResize);
    const result = await Promise.race([
        app.waitUntilExit().then(() => 'exit'),
        authActionPromise,
    ]);
    process.stdout.off('resize', handleResize);
    app.unmount();
    app.cleanup();
    exitAlternateScreen();
    return result;
};
(async () => {
    const argv = yargs(hideBin(process.argv))
        .option('resume', {
        type: 'boolean',
        desc: 'Resume a previous conversation',
        default: false,
    })
        .parseSync();
    const updateAction = await runUpdatePrompt();
    if (updateAction === 'updated') {
        process.stdout.write('MiniChat was updated. Please run `minichat` again.\n');
        process.exit(0);
    }
    // ── Page 1: Setup (only if no config saved) ───────────────────
    if (!getConfig()) {
        await runSetup();
        process.stdout.write('\x1Bc');
    }
    while (getConfig()) {
        const sessionId = argv.resume ? (await runResumePicker()) ?? createSessionId() : createSessionId();
        const initialTranscript = argv.resume && sessionId ? loadTranscript(sessionId) : [];
        const result = await runChatApp(sessionId, initialTranscript);
        argv.resume = false;
        const nextAction = resolvePostChatAction(result);
        if (nextAction === 'exit') {
            break;
        }
        await clearLoginState();
        process.stdout.write('\x1Bc');
        if (nextAction === 'stop') {
            break;
        }
        await runSetup();
        process.stdout.write('\x1Bc');
    }
})();
