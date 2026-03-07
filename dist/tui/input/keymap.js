const BACKSPACE_SEQUENCES = new Set(['\b', '\x7f']);
const FORWARD_DELETE_SEQUENCES = new Set(['\x1b[3~']);
export const isBackwardDelete = (sequence, input, key) => BACKSPACE_SEQUENCES.has(sequence) || key.backspace || input === '\b' || input === '\x7f';
export const isForwardDelete = (sequence, backwardDelete, key) => FORWARD_DELETE_SEQUENCES.has(sequence) || (key.delete && !backwardDelete);
export const isPaletteTypingInput = (input, key) => Boolean(input && /^[a-zA-Z]$/.test(input) && !key.ctrl && !key.meta && !key.return && !key.tab);
export const isFreeformTypingInput = (input) => Boolean(input);
