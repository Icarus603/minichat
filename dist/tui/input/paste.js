export const LARGE_PASTE_LINE_THRESHOLD = 5;
export const LARGE_PASTE_CHAR_THRESHOLD = 500;
export const BRACKETED_PASTE_START = '\x1b[200~';
export const BRACKETED_PASTE_END = '\x1b[201~';
export const isLargePaste = (text) => text.split('\n').length > LARGE_PASTE_LINE_THRESHOLD || text.length > LARGE_PASTE_CHAR_THRESHOLD;
export const createPastePlaceholder = (text, existing) => {
    const lineCount = text.split('\n').length;
    const base = lineCount > LARGE_PASTE_LINE_THRESHOLD
        ? `[Pasted Text: ${lineCount} lines]`
        : `[Pasted Text: ${text.length} chars]`;
    let placeholder = base;
    let suffix = 2;
    while (existing[placeholder]) {
        placeholder = `${base.replace(/\]$/, '')} #${suffix}]`;
        suffix += 1;
    }
    return placeholder;
};
export const expandPastePlaceholders = (text, pastedContent) => {
    let expanded = text;
    for (const [placeholder, content] of Object.entries(pastedContent)) {
        expanded = expanded.split(placeholder).join(content);
    }
    return expanded;
};
