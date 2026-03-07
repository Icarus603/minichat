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
  const configManager = await importFresh('dist/core/configManager.js', homeDir);

  configManager.saveConfig({
    provider: 'openrouter',
    apiKey: 'test-key',
    model: 'openai/gpt-5.3-codex',
    reasoningEffort: 'high',
    authMode: 'apiKey',
  });

  assert.deepEqual(configManager.getConfig(), {
    provider: 'openrouter',
    apiKey: 'test-key',
    model: 'openai/gpt-5.3-codex',
    reasoningEffort: 'high',
    authMode: 'apiKey',
  });

  configManager.clearConfig();
  assert.equal(configManager.getConfig(), null);
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

  const codexAuth = await importFresh('dist/core/codexAuth.js', homeDir);
  assert.equal(codexAuth.hasMinichatCodexAuth(), true);
  codexAuth.clearMinichatCodexAuth();
  assert.equal(codexAuth.hasMinichatCodexAuth(), false);
});
