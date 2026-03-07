import type { CommandDefinition } from './types.js';

export const BUILTIN_COMMANDS: CommandDefinition[] = [
  { name: '/model', description: 'Choose which model to use' },
  { name: '/new', description: 'Start a new conversation' },
  { name: '/sessions', description: 'Browse, resume, rename, or delete sessions' },
  { name: '/login', description: 'Return to the login screen' },
  { name: '/logout', description: 'Sign out and exit MiniChat' },
  { name: '/clear', description: 'Clear the transcript in current session' },
  { name: '/quit', description: 'Exit MiniChat' },
  { name: '/exit', description: 'Exit MiniChat' },
];

export function listCommands(): CommandDefinition[] {
  return BUILTIN_COMMANDS;
}

export function filterCommandRegistry(query: string): CommandDefinition[] {
  return BUILTIN_COMMANDS.filter((cmd) => cmd.name.startsWith(`/${query}`));
}
