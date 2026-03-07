export type Command = { name: string; description: string };
export const commands: Command[] = [
  { name: '/model', description: 'Choose which model to use' },
  { name: '/new', description: 'Start a new conversation' },
  { name: '/sessions', description: 'Browse, resume, rename, or delete sessions' },
  { name: '/login', description: 'Return to the login screen' },
  { name: '/logout', description: 'Sign out and exit MiniChat' },
  { name: '/clear', description: 'Clear the transcript in current session' },
  { name: '/quit', description: 'Exit MiniChat' },
  { name: '/exit', description: 'Exit MiniChat' }
];

export function filterCommands(query: string): Command[] {
  return commands.filter(cmd => cmd.name.startsWith('/' + query));
}
export function getAvailableCommands() {
  return commands;
}
