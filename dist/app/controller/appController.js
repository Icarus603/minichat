export function resolveNextScreen(options) {
    if (options.hasUpdate) {
        return 'update';
    }
    if (!options.hasConfig) {
        return 'setup';
    }
    if (options.shouldResume) {
        return 'resume';
    }
    return 'chat';
}
