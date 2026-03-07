import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const importFresh = async (relativePath, homeDir) => {
  process.env.HOME = homeDir;
  const moduleUrl = `${pathToFileURL(path.join(process.cwd(), relativePath)).href}?t=${Date.now()}-${Math.random()}`;
  return await import(moduleUrl);
};

test('config manager saves and clears provider-backed auth config', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-config-'));
  const configStore = await importFresh('dist/services/storage/configStore.js', homeDir);

  configStore.writeConfig({
    provider: 'openrouter',
    apiKey: 'test-key',
    model: 'openai/gpt-5.3-codex',
    reasoningEffort: 'high',
    authMode: 'apiKey',
  });

  assert.deepEqual(configStore.readConfig(), {
    provider: 'openrouter',
    apiKey: 'test-key',
    model: 'openai/gpt-5.3-codex',
    reasoningEffort: 'high',
    authMode: 'apiKey',
  });

  configStore.clearStoredConfig();
  assert.equal(configStore.readConfig(), null);
});

test('config manager preserves deepseek provider config', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-config-deepseek-'));
  const configStore = await importFresh('dist/services/storage/configStore.js', homeDir);

  configStore.writeConfig({
    provider: 'deepseek',
    apiKey: 'test-key',
    model: 'deepseek-reasoner',
    authMode: 'apiKey',
  });

  assert.deepEqual(configStore.readConfig(), {
    provider: 'deepseek',
    apiKey: 'test-key',
    model: 'deepseek-reasoner',
    reasoningEffort: undefined,
    authMode: 'apiKey',
  });
});

test('config manager trims API keys on save and read', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-config-trim-'));
  const configStore = await importFresh('dist/services/storage/configStore.js', homeDir);

  configStore.writeConfig({
    provider: 'openai',
    apiKey: '  test-key\r\n',
    model: 'gpt-4.1',
    authMode: 'apiKey',
  });

  assert.deepEqual(configStore.readConfig(), {
    provider: 'openai',
    apiKey: 'test-key',
    model: 'gpt-4.1',
    reasoningEffort: undefined,
    authMode: 'apiKey',
  });
});

test('config manager strips bracketed paste markers from API keys', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-config-bracketed-paste-'));
  const configStore = await importFresh('dist/services/storage/configStore.js', homeDir);

  configStore.writeConfig({
    provider: 'openai',
    apiKey: '[200~sk-test-123\r\n[201~',
    model: 'gpt-4.1',
    authMode: 'apiKey',
  });

  assert.deepEqual(configStore.readConfig(), {
    provider: 'openai',
    apiKey: 'sk-test-123',
    model: 'gpt-4.1',
    reasoningEffort: undefined,
    authMode: 'apiKey',
  });
});

test('codex auth helper clears imported MiniChat auth state', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-auth-'));
  const configDir = path.join(homeDir, '.minichat');
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    path.join(configDir, 'auth.json'),
    JSON.stringify({
      authMode: 'chatgpt',
      lastRefresh: null,
      tokens: {
        access_token: 'a',
        refresh_token: 'b',
        id_token: 'c',
        account_id: 'd',
      },
    })
  );

  const codexAuth = await importFresh('dist/services/auth/codexAuthService.js', homeDir);
  assert.equal(codexAuth.hasMinichatCodexAuth(), true);
  codexAuth.clearMinichatCodexAuth();
  assert.equal(codexAuth.hasMinichatCodexAuth(), false);
});
