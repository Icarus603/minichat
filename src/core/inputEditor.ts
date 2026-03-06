export type InputEditorState = {
  value: string;
  cursor: number;
};

export const createInputEditorState = (value = '', cursor = value.length): InputEditorState => ({
  value,
  cursor: clampCursor(value, cursor),
});

export const clampCursor = (value: string, cursor: number) => Math.max(0, Math.min(value.length, cursor));

const getLineStarts = (value: string) => {
  const starts = [0];

  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\n') {
      starts.push(i + 1);
    }
  }

  return starts;
};

const getCursorLineInfo = (value: string, cursor: number) => {
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

export const insertText = (state: InputEditorState, text: string): InputEditorState => {
  const value = state.value.slice(0, state.cursor) + text + state.value.slice(state.cursor);
  return {
    value,
    cursor: state.cursor + text.length,
  };
};

export const backspace = (state: InputEditorState): InputEditorState => {
  if (state.cursor === 0) return state;

  return {
    value: state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor),
    cursor: state.cursor - 1,
  };
};

export const deleteForward = (state: InputEditorState): InputEditorState => {
  if (state.cursor >= state.value.length) return state;

  return {
    value: state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1),
    cursor: state.cursor,
  };
};

export const moveLeft = (state: InputEditorState): InputEditorState => ({
  value: state.value,
  cursor: clampCursor(state.value, state.cursor - 1),
});

export const moveRight = (state: InputEditorState): InputEditorState => ({
  value: state.value,
  cursor: clampCursor(state.value, state.cursor + 1),
});

export const moveUp = (state: InputEditorState): InputEditorState => {
  const { lines, starts, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
  const targetLineIndex = lineIndex - 1;

  if (targetLineIndex < 0) return state;

  return {
    value: state.value,
    cursor: starts[targetLineIndex] + Math.min(column, lines[targetLineIndex].length),
  };
};

export const moveDown = (state: InputEditorState): InputEditorState => {
  const { lines, starts, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
  const targetLineIndex = lineIndex + 1;

  if (targetLineIndex >= lines.length) return state;

  return {
    value: state.value,
    cursor: starts[targetLineIndex] + Math.min(column, lines[targetLineIndex].length),
  };
};

export const clearEditor = (): InputEditorState => ({
  value: '',
  cursor: 0,
});

export const getRenderedLines = (state: InputEditorState) => {
  const { lines, lineIndex, column } = getCursorLineInfo(state.value, state.cursor);
  return { lines, cursorLineIndex: lineIndex, cursorColumn: column };
};
