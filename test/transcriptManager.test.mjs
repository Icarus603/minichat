import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const importFreshTranscriptManager = async (homeDir) => {
  process.env.HOME = homeDir;
  const moduleUrl = `${pathToFileURL(path.join(process.cwd(), 'dist/core/transcriptManager.js')).href}?t=${Date.now()}-${Math.random()}`;
  return await import(moduleUrl);
};

test('transcript manager saves, lists, renames, and deletes transcripts', async () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'minichat-test-'));
  const manager = await importFreshTranscriptManager(homeDir);

  manager.saveTranscript('session-a', [
    { role: 'user', content: 'hello there' },
    { role: 'ai', content: 'general kenobi' },
  ]);

  const listed = manager.listTranscripts();
  assert.equal(listed.length, 1);
  assert.equal(listed[0].id, 'session-a');
  assert.equal(listed[0].messageCount, 2);
  assert.match(listed[0].preview, /general kenobi/i);

  const renamed = manager.renameTranscript('session-a', 'Renamed Session');
  assert.equal(renamed, 'Renamed Session');
  assert.equal(manager.loadTranscript('Renamed Session').length, 2);

  const deleted = manager.deleteTranscript('Renamed Session');
  assert.equal(deleted, true);
  assert.equal(manager.listTranscripts().length, 0);
});
