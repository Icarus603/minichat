export const enterAlternateScreen = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?1049h\x1B[?2004h\x1B[2J\x1B[H');
};
export const exitAlternateScreen = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?2004l\x1B[?1049l');
};
export const hardResetTerminal = () => {
    process.stdout.write('\x1Bc');
};
export function bindChatResizeLifecycle(app, opts) {
    let previousColumns = process.stdout.columns ?? 0;
    let previousRows = process.stdout.rows ?? 0;
    const handleResize = () => {
        const nextColumns = process.stdout.columns ?? previousColumns;
        const nextRows = process.stdout.rows ?? previousRows;
        const expanded = nextColumns > previousColumns || nextRows > previousRows;
        previousColumns = nextColumns;
        previousRows = nextRows;
        if (expanded) {
            exitAlternateScreen();
            enterAlternateScreen();
            app.clear();
            opts?.onExpand?.();
            return;
        }
        setImmediate(() => {
            opts?.onShrink?.();
        });
    };
    process.stdout.prependListener('resize', handleResize);
    return () => {
        process.stdout.off('resize', handleResize);
    };
}
