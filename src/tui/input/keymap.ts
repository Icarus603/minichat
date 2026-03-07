import type { Key } from 'ink';

const BACKSPACE_SEQUENCES = new Set(['\b', '\x7f']);
const FORWARD_DELETE_SEQUENCES = new Set(['\x1b[3~']);

export const isBackwardDelete = (sequence: string, input: string, key: Key) =>
  BACKSPACE_SEQUENCES.has(sequence) || key.backspace || input === '\b' || input === '\x7f';

export const isForwardDelete = (sequence: string, backwardDelete: boolean, key: Key) =>
  FORWARD_DELETE_SEQUENCES.has(sequence) || (key.delete && !backwardDelete);

export const isPaletteTypingInput = (input: string, key: Key) =>
  Boolean(input && /^[a-zA-Z]$/.test(input) && !key.ctrl && !key.meta && !key.return && !key.tab);

export const isFreeformTypingInput = (input: string) => Boolean(input);
