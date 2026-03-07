import test from 'node:test';
import assert from 'node:assert/strict';

const editor = await import('../dist/tui/input/textBuffer.js');

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

test('insertText normalizes pasted CRLF and CR into LF', () => {
  const state = editor.createInputEditorState('', 0);
  const next = editor.insertText(state, 'a\r\nb\rc');
  assert.equal(next.value, 'a\nb\nc');
  assert.equal(next.cursor, 5);
});

test('revealPasteStart keeps pasted multi-line content visible from its start', () => {
  const state = editor.createInputEditorState('', 0);
  const inserted = editor.insertText(state, 'line1\nline2\nline3\nline4');
  const sized = editor.setViewportSize(inserted, 10, 2);
  const revealed = editor.revealPasteStart(state, sized, 10, 2);
  const viewport = editor.getViewportRenderedLines(revealed, 10, 2);

  assert.deepEqual(viewport.viewportLines, ['line1', 'line2']);
  assert.equal(viewport.scrollRow, 0);
});

test('moveUp and moveDown preserve visual column when possible', () => {
  const state = editor.createInputEditorState('hello\nxy\nworld', 8);
  const up = editor.moveUp(state);
  const down = editor.moveDown(up);

  assert.equal(up.cursor, 2);
  assert.equal(down.cursor, 8);
});

test('moveUp and moveDown follow wrapped visual rows', () => {
  const state = editor.createInputEditorState('abcdefghij', 6);
  const up = editor.moveUp(state, 4);
  const down = editor.moveDown(up, 4);

  assert.equal(up.cursor, 2);
  assert.equal(down.cursor, 6);
});

test('wrapped boundary belongs to the later visual row', () => {
  const state = editor.createInputEditorState('abcdefghij', 4);
  const rendered = editor.getRenderedLines(state, 4);

  assert.equal(rendered.cursorLineIndex, 1);
  assert.equal(rendered.cursorColumn, 0);
});

test('moveToVisualLineStart jumps to the current wrapped row start', () => {
  const state = editor.createInputEditorState('abcdefghij', 6);
  const next = editor.moveToVisualLineStart(state, 4);

  assert.equal(next.cursor, 4);
});

test('moveToVisualLineEnd jumps to the current wrapped row end', () => {
  const state = editor.createInputEditorState('abcdefghij', 6);
  const next = editor.moveToVisualLineEnd(state, 4);

  assert.equal(next.cursor, 8);
});

test('viewport follows cursor for wrapped content', () => {
  const state = editor.createInputEditorState('abcdef', 6);
  const viewport = editor.getViewportRenderedLines(state, 2, 2);

  assert.deepEqual(viewport.viewportLines, ['cd', 'ef']);
  assert.equal(viewport.scrollRow, 1);
  assert.equal(viewport.viewportCursorLineIndex, 1);
});

test('rendered lines keep chinese characters on the same visual row', () => {
  const state = editor.createInputEditorState('你好世界', 4);
  const rendered = editor.getRenderedLines(state, 8);

  assert.deepEqual(rendered.lines, ['你好世界']);
  assert.equal(rendered.cursorLineIndex, 0);
  assert.equal(rendered.cursorColumn, 8);
});
