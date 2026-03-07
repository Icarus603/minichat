import test from 'node:test';
import assert from 'node:assert/strict';

const { resolvePostChatAction } = await import('../dist/app/controller/appFlow.js');

test('resolvePostChatAction maps login to setup', () => {
  assert.equal(resolvePostChatAction('login'), 'setup');
});

test('resolvePostChatAction maps logout to stop', () => {
  assert.equal(resolvePostChatAction('logout'), 'stop');
});

test('resolvePostChatAction maps exit to exit', () => {
  assert.equal(resolvePostChatAction('exit'), 'exit');
});
