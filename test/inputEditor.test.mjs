import test from 'node:test';
import assert from 'node:assert/strict';

const editor = await import('../dist/core/inputEditor.js');

test('backspace removes the character before the cursor', () => {
  const state = editor.createInputEditorState('abcd', 2);
  const next = editor.backspace(state);
  assert.equal(next.value, 'acd');
  assert.equal(next.cursor, 1);
});

test('deleteForward removes the character after the cursor', () => {
  const state = editor.createInputEditorState('abcd', 2);
  const next = editor.deleteForward(state);
  assert.equal(next.value, 'abd');
  assert.equal(next.cursor, 2);
});

test('moveUp and moveDown preserve visual column when possible', () => {
  const state = editor.createInputEditorState('hello\nxy\nworld', 8);
  const up = editor.moveUp(state);
  const down = editor.moveDown(up);

  assert.equal(up.cursor, 2);
  assert.equal(down.cursor, 8);
});
