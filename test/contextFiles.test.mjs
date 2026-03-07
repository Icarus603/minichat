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

test('context file helpers append notes into sectioned SOUL.md', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-context-'));
  const contextFiles = await importFresh('dist/services/storage/soulStore.js', homeDir);

  assert.equal(
    contextFiles.appendSoulEntry({
      section: 'User Preferences',
      note: 'User prefers Traditional Chinese.',
    }),
    true,
  );

  assert.equal(
    contextFiles.appendSoulEntry({
      section: 'How To Be With This User',
      note: 'Be a little more playful when the user is relaxed.',
    }),
    true,
  );

  const soul = fs.readFileSync(path.join(homeDir, '.minichat', 'SOUL.md'), 'utf8');
  assert.match(soul, /## User Preferences/);
  assert.match(soul, /Be a little more playful when the user is relaxed\./);
  assert.match(soul, /User prefers Traditional Chinese\./);
});
