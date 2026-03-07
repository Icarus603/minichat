import test from 'node:test';
import assert from 'node:assert/strict';

const { shouldConsiderSoulSync } = await import('../dist/core/contextEvolution.js');

test('shouldConsiderSoulSync ignores ordinary short chat', () => {
  assert.equal(
    shouldConsiderSoulSync([
      { role: 'user', content: 'hi' },
    ]),
    false,
  );

  assert.equal(
    shouldConsiderSoulSync([
      { role: 'user', content: '今天過得怎麼樣？' },
    ]),
    false,
  );
});

test('shouldConsiderSoulSync flags durable preference and memory cues', () => {
  assert.equal(
    shouldConsiderSoulSync([
      { role: 'user', content: '我希望你用詩意而富有哲思的語言和我交流。' },
    ]),
    true,
  );

  assert.equal(
    shouldConsiderSoulSync([
      { role: 'user', content: '記住我比較喜歡你直接一點，不要太像客服。' },
    ]),
    true,
  );
});
