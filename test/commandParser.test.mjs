import test from 'node:test';
import assert from 'node:assert/strict';

const { getAvailableCommands, filterCommands } = await import('../dist/core/commandParser.js');

test('command list includes auth, sessions, and model commands', () => {
  const names = getAvailableCommands().map(command => command.name);
  assert.ok(names.includes('/model'));
  assert.ok(names.includes('/new'));
  assert.ok(names.includes('/sessions'));
  assert.ok(names.includes('/login'));
  assert.ok(names.includes('/logout'));
  assert.equal(names.includes('/remember'), false);
  assert.equal(names.includes('/soul'), false);
});

test('filterCommands matches /sessions by prefix', () => {
  const matches = filterCommands('ses').map(command => command.name);
  assert.deepEqual(matches, ['/sessions']);
});
