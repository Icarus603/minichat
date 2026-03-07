import test from 'node:test';
import assert from 'node:assert/strict';

const { listCommands: getAvailableCommands, filterCommandRegistry: filterCommands } = await import('../dist/app/commands/registry.js');
const { executeCommand } = await import('../dist/app/controller/commandController.js');

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

test('executeCommand resolves builtin command actions', () => {
  assert.deepEqual(executeCommand('/model'), { type: 'open-model-picker' });
  assert.deepEqual(executeCommand('/logout'), { type: 'auth', action: 'logout' });
  assert.equal(executeCommand('/missing'), null);
});
