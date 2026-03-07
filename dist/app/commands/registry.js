export const BUILTIN_COMMANDS = [
    { name: '/model', description: 'Choose which model to use', action: { type: 'open-model-picker' } },
    { name: '/new', description: 'Start a new conversation', action: { type: 'new-session' } },
    { name: '/sessions', description: 'Browse, resume, rename, or delete sessions', action: { type: 'open-sessions' } },
    { name: '/login', description: 'Return to the login screen', action: { type: 'auth', action: 'login' } },
    { name: '/logout', description: 'Sign out and exit MiniChat', action: { type: 'auth', action: 'logout' } },
    { name: '/clear', description: 'Clear the transcript in current session', action: { type: 'clear-transcript' } },
    { name: '/quit', description: 'Exit MiniChat', action: { type: 'exit-app' } },
    { name: '/exit', description: 'Exit MiniChat', action: { type: 'exit-app' } },
];
export function listCommands() {
    return BUILTIN_COMMANDS;
}
export function filterCommandRegistry(query) {
    return BUILTIN_COMMANDS.filter((cmd) => cmd.name.startsWith(`/${query}`));
}
export function resolveCommandAction(commandName) {
    return BUILTIN_COMMANDS.find((cmd) => cmd.name === commandName)?.action ?? null;
}
