import { disableBracketedPasteMode, enableBracketedPasteMode } from '../tui/input/terminalCapabilities.js';

export const enterAlternateScreen = () => {
  if (!process.stdout.isTTY) return;
  process.stdout.write('\x1B[?1049h\x1B[2J\x1B[H');
  enableBracketedPasteMode();
};

export const exitAlternateScreen = () => {
  if (!process.stdout.isTTY) return;
  disableBracketedPasteMode();
  process.stdout.write('\x1B[?1049l');
};

export const hardResetTerminal = () => {
  process.stdout.write('\x1Bc');
};
