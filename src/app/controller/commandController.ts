import { resolveCommandAction } from '../commands/registry.js';
import type { CommandAction } from '../commands/types.js';

export function executeCommand(commandName: string): CommandAction | null {
  return resolveCommandAction(commandName);
}
