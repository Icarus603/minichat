export function resolvePostChatAction(result) {
    if (result === 'exit') {
        return 'exit';
    }
    if (result === 'login') {
        return 'setup';
    }
    return 'stop';
}
