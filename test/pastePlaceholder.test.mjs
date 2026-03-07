import test from 'node:test';
import assert from 'node:assert/strict';

const LARGE_PASTE_LINE_THRESHOLD = 5;
const LARGE_PASTE_CHAR_THRESHOLD = 500;

const isLargePaste = (text) =>
  text.split('\n').length > LARGE_PASTE_LINE_THRESHOLD || text.length > LARGE_PASTE_CHAR_THRESHOLD;

const createPastePlaceholder = (text, existing) => {
  const lineCount = text.split('\n').length;
  const base =
    lineCount > LARGE_PASTE_LINE_THRESHOLD
      ? `[Pasted Text: ${lineCount} lines]`
      : `[Pasted Text: ${text.length} chars]`;

  let placeholder = base;
  let suffix = 2;
  while (existing[placeholder]) {
    placeholder = `${base.replace(/\]$/, '')} #${suffix}]`;
    suffix += 1;
  }

  return placeholder;
};

const expandPastePlaceholders = (text, pastedContent) => {
  let expanded = text;
  for (const [placeholder, content] of Object.entries(pastedContent)) {
    expanded = expanded.split(placeholder).join(content);
  }
  return expanded;
};

test('large multi-line paste becomes a placeholder', () => {
  const pasted = 'a\nb\nc\nd\ne\nf';
  assert.equal(isLargePaste(pasted), true);
  assert.equal(createPastePlaceholder(pasted, {}), '[Pasted Text: 6 lines]');
});

test('placeholder expansion restores the original pasted content', () => {
  const pasted = 'line1\nline2\nline3\nline4\nline5\nline6';
  const placeholder = createPastePlaceholder(pasted, {});
  const expanded = expandPastePlaceholders(`before ${placeholder} after`, {
    [placeholder]: pasted,
  });

  assert.equal(expanded, `before ${pasted} after`);
});

test('duplicate placeholders get numbered suffixes', () => {
  const pasted = 'x\nx\nx\nx\nx\nx';
  const first = createPastePlaceholder(pasted, {});
  const second = createPastePlaceholder(pasted, { [first]: pasted });

  assert.equal(first, '[Pasted Text: 6 lines]');
  assert.equal(second, '[Pasted Text: 6 lines #2]');
});

test('very long single-line paste also becomes a placeholder', () => {
  const pasted = 'a'.repeat(600);
  assert.equal(isLargePaste(pasted), true);
  assert.equal(createPastePlaceholder(pasted, {}), '[Pasted Text: 600 chars]');
});
