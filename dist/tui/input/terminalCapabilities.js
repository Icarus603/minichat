export const enableBracketedPasteMode = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?2004h');
};
export const disableBracketedPasteMode = () => {
    if (!process.stdout.isTTY)
        return;
    process.stdout.write('\x1B[?2004l');
};
