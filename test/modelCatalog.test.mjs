import test from 'node:test';
import assert from 'node:assert/strict';

const modelCatalog = await import('../dist/core/modelCatalog.js');

test('ChatGPT managed models include the official visible Codex picker defaults', () => {
  const ids = modelCatalog.getChatGPTManagedModels().map(model => model.id);
  assert.deepEqual(ids, [
    'gpt-5.3-codex',
    'gpt-5.4',
    'gpt-5.2-codex',
    'gpt-5.1-codex-max',
    'gpt-5.2',
    'gpt-5.1-codex-mini',
  ]);
});

test('OpenRouter model filtering removes free, suffixed, safeguard, and non-chat variants', () => {
  const filtered = modelCatalog.filterOpenRouterModelIds([
    'openai/gpt-5.3-codex',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-120b:free',
    'openai/gpt-oss-120b:exacto',
    'openai/gpt-oss-safeguard-20b',
    'openai/gpt-4o-audio-preview',
    'anthropic/claude-sonnet-4',
  ]);

  assert.deepEqual(filtered, [
    'openai/gpt-5.3-codex',
    'openai/gpt-oss-120b',
  ]);
});

test('reasoning effort options mirror model family support', () => {
  const codexConfig = { model: 'gpt-5.4', authMode: 'chatgpt' };
  const openaiConfig = { model: 'gpt-5.2', apiKey: 'test-key', provider: 'openai', authMode: 'apiKey' };
  const deepseekConfig = { model: 'deepseek-chat', apiKey: 'test-key', provider: 'deepseek', authMode: 'apiKey' };

  assert.equal(modelCatalog.supportsReasoningEffort(codexConfig, 'gpt-5.4'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(codexConfig, 'gpt-5.3-codex'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(codexConfig, 'gpt-5.1-codex-mini'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(codexConfig, 'gpt-4.1'), false);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(codexConfig, 'gpt-5.4'), [
    'low',
    'medium',
    'high',
    'xhigh',
  ]);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(codexConfig, 'gpt-5.1-codex-mini'), [
    'medium',
    'high',
  ]);

  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5.2'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5.2-pro'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5-pro'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5.1'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5.1-mini'), true);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-5.4'), false);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'openai/gpt-5.3-codex'), false);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'openai/gpt-oss-120b'), false);
  assert.equal(modelCatalog.supportsReasoningEffort(openaiConfig, 'gpt-4.1'), false);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(openaiConfig, 'gpt-5.2'), [
    'none',
    'low',
    'medium',
    'high',
    'xhigh',
  ]);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(openaiConfig, 'gpt-5.2-pro'), [
    'medium',
    'high',
    'xhigh',
  ]);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(openaiConfig, 'gpt-5-pro'), [
    'high',
  ]);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(openaiConfig, 'gpt-5.1'), [
    'none',
    'low',
    'medium',
    'high',
  ]);

  assert.deepEqual(modelCatalog.getReasoningEffortOptions(openaiConfig, 'gpt-5.4'), []);

  assert.equal(modelCatalog.supportsReasoningEffort(deepseekConfig, 'deepseek-chat'), false);
  assert.equal(modelCatalog.supportsReasoningEffort(deepseekConfig, 'deepseek-reasoner'), false);
  assert.deepEqual(modelCatalog.getReasoningEffortOptions(deepseekConfig, 'deepseek-chat'), []);
});

test('DeepSeek managed models expose chat and reasoner choices', async () => {
  const models = await modelCatalog.listAvailableModels({
    model: 'deepseek-chat',
    apiKey: 'test-key',
    provider: 'deepseek',
    authMode: 'apiKey',
  });

  assert.deepEqual(models.map(model => model.id), [
    'deepseek-chat',
    'deepseek-reasoner',
  ]);
});
