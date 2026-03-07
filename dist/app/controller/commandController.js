import { resolveCommandAction } from '../commands/registry.js';
export function executeCommand(commandName) {
    return resolveCommandAction(commandName);
}
