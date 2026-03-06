export const createInputEditorState = (value = '', cursor = value.length) => ({
    value,
    cursor: clampCursor(value, cursor),
});
export const clampCursor = (value, cursor) => Math.max(0, Math.min(value.length, cursor));
const getLineStarts = (value) => {
    const starts = [0];
    for (let i = 0; i < value.length; i++) {
        if (value[i] === '\n') {
            starts.push(i + 1);
        }
    }
    return starts;
};
const getCursorLineInfo = (value, cursor) => {
    const lines = value.split('\n');
    const starts = getLineStarts(value);
    let lineIndex = 0;
    for (let i = starts.length - 1; i >= 0; i--) {
        if (cursor >= starts[i]) {
            lineIndex = i;
            break;
        }
    }
    return {
        lines,
        starts,
        lineIndex,
        column: Math.min(cursor - starts[lineIndex], lines[lineIndex]?.length ?? 0),
    };
};
export const insertText = (state, text) => {
    const value = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
    return {
        value,
        cursor: state.cursor + text.length,
    };
};
export const backspace = (state) => {
    if (state.cursor === 0)
        return state;
    return {
        value: state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor),
        cursor: state.cursor - 1,
    };
};
export const deleteForward = (state) => {
    if (state.cursor >= state.value.length)
        return state;
    return {
        value: state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1),
        cursor: state.cursor,
    };
};
export const moveLeft = (state) => ({
    value: state.value,
    cursor: clampCursor(state.value, state.cursor - 1),
});
export const moveRight = (state) => ({
    value: state.value,
    cursor: clampCursor(state.value, state.cursor + 1),
});
export const moveUp = (state) => {
    const { lines, starts, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
    const targetLineIndex = lineIndex - 1;
    if (targetLineIndex < 0)
        return state;
    return {
        value: state.value,
        cursor: starts[targetLineIndex] + Math.min(column, lines[targetLineIndex].length),
    };
};
export const moveDown = (state) => {
    const { lines, starts, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
    const targetLineIndex = lineIndex + 1;
    if (targetLineIndex >= lines.length)
        return state;
    return {
        value: state.value,
        cursor: starts[targetLineIndex] + Math.min(column, lines[targetLineIndex].length),
    };
};
export const clearEditor = () => ({
    value: '',
    cursor: 0,
});
export const getRenderedLines = (state) => {
    const { lines, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
    return { lines, cursorLineIndex: lineIndex, cursorColumn: column };
};
