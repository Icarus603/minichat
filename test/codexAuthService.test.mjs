import test from 'node:test';
import assert from 'node:assert/strict';

import { parseCodexExecJsonOutput } from '../dist/services/auth/codexAuthService.js';

test('parseCodexExecJsonOutput extracts agent_message text from codex JSON events', () => {
  const stdout = [
    '{"type":"thread.started","thread_id":"019cc889-a4ea-7e83-947e-673ed5e4f9ad"}',
    '{"type":"turn.started"}',
    '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"hey, it’s good to see you. how’s your day going?"}}',
    '{"type":"turn.completed","usage":{"input_tokens":8193,"cached_input_tokens":7040,"output_tokens":87}}',
  ].join('\n');

  assert.equal(
    parseCodexExecJsonOutput(stdout),
    'hey, it’s good to see you. how’s your day going?',
  );
});
