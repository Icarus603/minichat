export const commands = [
    { name: '/clear', description: 'Clear the transcript in current session' },
    { name: '/quit', description: 'Exit MiniChat' },
    { name: '/exit', description: 'Exit MiniChat' }
];
export function filterCommands(query) {
    return commands.filter(cmd => cmd.name.startsWith('/' + query));
}
export function getAvailableCommands() {
    return commands;
}
