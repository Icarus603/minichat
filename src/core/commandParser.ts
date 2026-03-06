export type Command = { name: string; description: string };
export const commands: Command[] = [
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
