import stringWidth from 'string-width';

export type InputEditorState = {
  value: string;
  cursor: number;
  preferredVisualColumn: number | null;
  scrollRow: number;
  viewportMode: 'follow-cursor' | 'manual';
  selection: null;
  undoStack: string[];
  redoStack: string[];
};

export type VisualLine = {
  text: string;
  logicalLineIndex: number;
  start: number;
  end: number;
  absoluteStart: number;
  absoluteEnd: number;
  charStart: number;
  charEnd: number;
  rowInLogicalLine: number;
  width: number;
};

export type TextBufferView = {
  lines: string[];
  visualLines: VisualLine[];
  viewportLines: string[];
  cursorLineIndex: number;
  cursorColumn: number;
  cursorOffset: number;
  cursorCharIndex: number;
  viewportCursorLineIndex: number;
  viewportCursorColumn: number;
  viewportCursorOffset: number;
  viewportCursorCharIndex: number;
  scrollRow: number;
};

type CursorLineInfo = {
  lines: string[];
  starts: number[];
  lineIndex: number;
  column: number;
};

type WrappedSegment = VisualLine;

const DEFAULT_VIEWPORT_WIDTH = Number.POSITIVE_INFINITY;
const DEFAULT_VIEWPORT_HEIGHT = Number.POSITIVE_INFINITY;

const normalizeInputText = (text: string) =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

export const clampCursor = (value: string, cursor: number) =>
  Math.max(0, Math.min(value.length, cursor));

const createBaseState = (value: string, cursor: number): InputEditorState => ({
  value,
  cursor: clampCursor(value, cursor),
  preferredVisualColumn: null,
  scrollRow: 0,
  viewportMode: 'follow-cursor',
  selection: null,
  undoStack: [],
  redoStack: [],
});

export const createInputEditorState = (value = '', cursor = value.length): InputEditorState =>
  createBaseState(value, cursor);

export const clearEditor = (): InputEditorState => createBaseState('', 0);

export const setText = (state: InputEditorState, value: string, cursor = value.length): InputEditorState => ({
  ...state,
  value,
  cursor: clampCursor(value, cursor),
  preferredVisualColumn: null,
  viewportMode: 'follow-cursor',
  selection: null,
});

export const getOffset = (state: InputEditorState) => state.cursor;

const getLineStarts = (value: string) => {
  const starts = [0];

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '\n') {
      starts.push(index + 1);
    }
  }

  return starts;
};

const getCursorLineInfo = (value: string, cursor: number): CursorLineInfo => {
  const lines = value.split('\n');
  const starts = getLineStarts(value);
  let lineIndex = 0;

  for (let index = starts.length - 1; index >= 0; index -= 1) {
    if (cursor >= starts[index]) {
      lineIndex = index;
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

const widthOf = (text: string) => Math.max(0, stringWidth(text));

const toChars = (text: string) => Array.from(text);

const wrapLine = (
  line: string,
  logicalLineIndex: number,
  lineStartOffset: number,
  width: number,
): WrappedSegment[] => {
  const maxWidth = Number.isFinite(width) ? Math.max(1, Math.floor(width)) : Number.POSITIVE_INFINITY;

  if (line.length === 0) {
    return [{
      text: '',
      logicalLineIndex,
      start: 0,
      end: 0,
      absoluteStart: lineStartOffset,
      absoluteEnd: lineStartOffset,
      charStart: 0,
      charEnd: 0,
      rowInLogicalLine: 0,
      width: 0,
    }];
  }

  const chars = toChars(line);
  const segments: WrappedSegment[] = [];
  let segmentText = '';
  let segmentWidth = 0;
  let segmentStart = 0;
  let segmentCharStart = 0;
  let codeUnitOffset = 0;
  let rowInLogicalLine = 0;

  chars.forEach((char, charIndex) => {
    const charDisplayWidth = Math.max(1, widthOf(char));
    const nextOffset = codeUnitOffset + char.length;

    if (
      segmentText &&
      Number.isFinite(maxWidth) &&
      segmentWidth + charDisplayWidth > maxWidth
    ) {
      segments.push({
        text: segmentText,
        logicalLineIndex,
        start: segmentStart,
        end: codeUnitOffset,
        absoluteStart: lineStartOffset + segmentStart,
        absoluteEnd: lineStartOffset + codeUnitOffset,
        charStart: segmentCharStart,
        charEnd: charIndex,
        rowInLogicalLine,
        width: segmentWidth,
      });
      segmentText = '';
      segmentWidth = 0;
      segmentStart = codeUnitOffset;
      segmentCharStart = charIndex;
      rowInLogicalLine += 1;
    }

    segmentText += char;
    segmentWidth += charDisplayWidth;
    codeUnitOffset = nextOffset;
  });

  segments.push({
    text: segmentText,
    logicalLineIndex,
    start: segmentStart,
    end: codeUnitOffset,
    absoluteStart: lineStartOffset + segmentStart,
    absoluteEnd: lineStartOffset + codeUnitOffset,
    charStart: segmentCharStart,
    charEnd: chars.length,
    rowInLogicalLine,
    width: segmentWidth,
  });

  return segments;
};

const buildVisualLines = (value: string, width = DEFAULT_VIEWPORT_WIDTH) => {
  const lines = value.split('\n');
  const starts = getLineStarts(value);
  return lines.flatMap((line, logicalLineIndex) =>
    wrapLine(line, logicalLineIndex, starts[logicalLineIndex] ?? 0, width),
  );
};

const getCursorPositionInSegment = (segment: WrappedSegment, line: string, column: number) => {
  const clampedColumn = Math.max(segment.start, Math.min(column, segment.end));
  const beforeCursor = line.slice(segment.start, clampedColumn);
  return {
    displayColumn: widthOf(beforeCursor),
    charIndex: toChars(beforeCursor).length,
    offset: clampedColumn - segment.start,
  };
};

const getLayout = (state: InputEditorState, width = DEFAULT_VIEWPORT_WIDTH) => {
  const info = getCursorLineInfo(state.value, state.cursor);
  const visualLines = buildVisualLines(state.value, width);
  let cursorLineIndex = 0;
  let cursorColumn = 0;
  let cursorOffset = 0;
  let cursorCharIndex = 0;
  const segmentsForLine = visualLines
    .map((segment, visualIndex) => ({ segment, visualIndex }))
    .filter(({ segment }) => segment.logicalLineIndex === info.lineIndex);
  const activeLine = info.lines[info.lineIndex] ?? '';

  if (segmentsForLine.length > 0) {
    let active = segmentsForLine[segmentsForLine.length - 1];
    const lineLength = activeLine.length;

    if (info.column === 0) {
      active = segmentsForLine[0];
    } else if (info.column >= lineLength) {
      active = segmentsForLine[segmentsForLine.length - 1];
    } else {
      const candidate = segmentsForLine.find(({ segment }) =>
        info.column >= segment.start && info.column < segment.end,
      );

      if (candidate) {
        active = candidate;
      }
    }

    const position = getCursorPositionInSegment(active.segment, activeLine, info.column);
    cursorLineIndex = active.visualIndex;
    cursorColumn = position.displayColumn;
    cursorOffset = position.offset;
    cursorCharIndex = position.charIndex;
  }

  return {
    info,
    visualLines,
    cursorLineIndex,
    cursorColumn,
    cursorOffset,
    cursorCharIndex,
  };
};

const clampScrollRow = (scrollRow: number, totalRows: number, height: number) => {
  if (!Number.isFinite(height)) {
    return 0;
  }

  const maxHeight = Math.max(1, Math.floor(height));
  const maxScroll = Math.max(0, totalRows - maxHeight);
  return Math.max(0, Math.min(maxScroll, scrollRow));
};

const ensureCursorVisible = (
  scrollRow: number,
  cursorLineIndex: number,
  totalRows: number,
  height = DEFAULT_VIEWPORT_HEIGHT,
) => {
  if (!Number.isFinite(height)) {
    return 0;
  }

  const maxHeight = Math.max(1, Math.floor(height));
  const clampedScroll = clampScrollRow(scrollRow, totalRows, maxHeight);

  if (cursorLineIndex < clampedScroll) {
    return cursorLineIndex;
  }

  if (cursorLineIndex >= clampedScroll + maxHeight) {
    return cursorLineIndex - maxHeight + 1;
  }

  return clampedScroll;
};

const withViewport = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
): InputEditorState => {
  const layout = getLayout(state, width);
  const scrollRow = ensureCursorVisible(
    state.scrollRow,
    layout.cursorLineIndex,
    layout.visualLines.length,
    height,
  );

  if (scrollRow === state.scrollRow) {
    return state;
  }

  return {
    ...state,
    scrollRow,
  };
};

const withCursor = (
  state: InputEditorState,
  cursor: number,
  preferredVisualColumn: number | null,
): InputEditorState => ({
  ...state,
  cursor: clampCursor(state.value, cursor),
  preferredVisualColumn,
  selection: null,
});

export const insertText = (state: InputEditorState, text: string): InputEditorState => {
  const normalizedText = normalizeInputText(text);
  const isPaste = normalizedText.length > 1 || normalizedText.includes('\n');
  const value = state.value.slice(0, state.cursor) + normalizedText + state.value.slice(state.cursor);
  return {
    ...state,
    value,
    cursor: state.cursor + normalizedText.length,
    preferredVisualColumn: null,
    viewportMode: isPaste ? state.viewportMode : 'follow-cursor',
    selection: null,
  };
};

export const backspace = (state: InputEditorState): InputEditorState => {
  if (state.cursor === 0) {
    return state;
  }

  return {
    ...state,
    value: state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor),
    cursor: state.cursor - 1,
    preferredVisualColumn: null,
    viewportMode: 'follow-cursor',
    selection: null,
  };
};

export const deleteForward = (state: InputEditorState): InputEditorState => {
  if (state.cursor >= state.value.length) {
    return state;
  }

  return {
    ...state,
    value: state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1),
    cursor: state.cursor,
    preferredVisualColumn: null,
    viewportMode: 'follow-cursor',
    selection: null,
  };
};

export const moveLeft = (state: InputEditorState): InputEditorState =>
  ({
    ...withCursor(state, state.cursor - 1, null),
    viewportMode: 'follow-cursor',
  });

export const moveRight = (state: InputEditorState): InputEditorState =>
  ({
    ...withCursor(state, state.cursor + 1, null),
    viewportMode: 'follow-cursor',
  });

const getCursorForDisplayColumn = (segment: VisualLine, desiredColumn: number) => {
  let consumedWidth = 0;
  let consumedChars = 0;
  let consumedCodeUnits = 0;

  for (const char of toChars(segment.text)) {
    const charDisplayWidth = Math.max(1, widthOf(char));
    if (consumedWidth + charDisplayWidth > desiredColumn) {
      break;
    }

    consumedWidth += charDisplayWidth;
    consumedChars += 1;
    consumedCodeUnits += char.length;
  }

  return {
    cursor: segment.absoluteStart + consumedCodeUnits,
    displayColumn: consumedWidth,
    charIndex: consumedChars,
  };
};

export const moveToVisualPosition = (
  state: InputEditorState,
  width: number,
  visualRow: number,
  visualColumn: number,
): InputEditorState => {
  const layout = getLayout(state, width);

  if (layout.visualLines.length === 0) {
    return state;
  }

  const targetRow = Math.max(0, Math.min(layout.visualLines.length - 1, visualRow));
  const targetLine = layout.visualLines[targetRow];
  const target = getCursorForDisplayColumn(targetLine, Math.max(0, visualColumn));

  return {
    ...state,
    cursor: target.cursor,
    preferredVisualColumn: target.displayColumn,
    selection: null,
  };
};

export const moveToVisualLineStart = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
): InputEditorState => {
  const layout = getLayout(state, width);
  const next = moveToVisualPosition(state, width, layout.cursorLineIndex, 0);
  return {
    ...next,
    preferredVisualColumn: null,
    viewportMode: 'follow-cursor',
  };
};

export const moveToVisualLineEnd = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
): InputEditorState => {
  const layout = getLayout(state, width);
  const next = moveToVisualPosition(
    state,
    width,
    layout.cursorLineIndex,
    Number.POSITIVE_INFINITY,
  );
  return {
    ...next,
    preferredVisualColumn: null,
    viewportMode: 'follow-cursor',
  };
};

export const moveUp = (state: InputEditorState, width = DEFAULT_VIEWPORT_WIDTH): InputEditorState => {
  const layout = getLayout(state, width);
  if (layout.cursorLineIndex <= 0) {
    return state;
  }

  const desiredColumn = state.preferredVisualColumn ?? layout.cursorColumn;
  const next = moveToVisualPosition(state, width, layout.cursorLineIndex - 1, desiredColumn);
  return {
    ...next,
    preferredVisualColumn: desiredColumn,
    viewportMode: 'follow-cursor',
  };
};

export const moveDown = (state: InputEditorState, width = DEFAULT_VIEWPORT_WIDTH): InputEditorState => {
  const layout = getLayout(state, width);
  if (layout.cursorLineIndex >= layout.visualLines.length - 1) {
    return state;
  }

  const desiredColumn = state.preferredVisualColumn ?? layout.cursorColumn;
  const next = moveToVisualPosition(state, width, layout.cursorLineIndex + 1, desiredColumn);
  return {
    ...next,
    preferredVisualColumn: desiredColumn,
    viewportMode: 'follow-cursor',
  };
};

export const setViewportSize = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
): InputEditorState => {
  if (state.viewportMode === 'manual') {
    const totalRows = getLayout(state, width).visualLines.length;
    return {
      ...state,
      scrollRow: clampScrollRow(state.scrollRow, totalRows, height),
    };
  }

  return withViewport(state, width, height);
};

export const revealPasteStart = (
  previousState: InputEditorState,
  nextState: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
): InputEditorState => {
  if (!Number.isFinite(height)) {
    return nextState;
  }

  const insertedRangeStart = previousState.cursor;
  const insertedStartState = {
    ...nextState,
    cursor: insertedRangeStart,
    preferredVisualColumn: null,
  };
  const layout = getLayout(insertedStartState, width);
  const scrollRow = clampScrollRow(layout.cursorLineIndex, layout.visualLines.length, height);

  return {
    ...nextState,
    scrollRow,
    viewportMode: 'manual',
  };
};

export const getRenderedLines = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
): TextBufferView => {
  const normalized = withViewport(state, width, DEFAULT_VIEWPORT_HEIGHT);
  const layout = getLayout(normalized, width);
  const lines = layout.visualLines.map((line) => line.text);

  return {
    lines,
    visualLines: layout.visualLines,
    viewportLines: lines,
    cursorLineIndex: layout.cursorLineIndex,
    cursorColumn: layout.cursorColumn,
    cursorOffset: layout.cursorOffset,
    cursorCharIndex: layout.cursorCharIndex,
    viewportCursorLineIndex: layout.cursorLineIndex,
    viewportCursorColumn: layout.cursorColumn,
    viewportCursorOffset: layout.cursorOffset,
    viewportCursorCharIndex: layout.cursorCharIndex,
    scrollRow: 0,
  };
};

export const getViewportRenderedLines = (
  state: InputEditorState,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
): TextBufferView => {
  const normalized = state.viewportMode === 'manual'
    ? state
    : withViewport(state, width, height);
  const layout = getLayout(normalized, width);
  const maxHeight = Number.isFinite(height) ? Math.max(1, Math.floor(height)) : Number.POSITIVE_INFINITY;
  const scrollRow = normalized.scrollRow;
  const viewportLines = Number.isFinite(maxHeight)
    ? layout.visualLines.slice(scrollRow, scrollRow + maxHeight)
    : layout.visualLines;

  return {
    lines: layout.visualLines.map((line) => line.text),
    visualLines: layout.visualLines,
    viewportLines: viewportLines.map((line) => line.text),
    cursorLineIndex: layout.cursorLineIndex,
    cursorColumn: layout.cursorColumn,
    cursorOffset: layout.cursorOffset,
    cursorCharIndex: layout.cursorCharIndex,
    viewportCursorLineIndex: layout.cursorLineIndex - scrollRow,
    viewportCursorColumn: layout.cursorColumn,
    viewportCursorOffset: layout.cursorOffset,
    viewportCursorCharIndex: layout.cursorCharIndex,
    scrollRow,
  };
};

export const scrollViewportUp = (
  state: InputEditorState,
  amount = 1,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
) => {
  if (!Number.isFinite(height)) {
    return state;
  }

  const totalRows = getLayout(state, width).visualLines.length;
  return {
    ...state,
    scrollRow: clampScrollRow(state.scrollRow - amount, totalRows, height),
    viewportMode: 'manual',
  };
};

export const scrollViewportDown = (
  state: InputEditorState,
  amount = 1,
  width = DEFAULT_VIEWPORT_WIDTH,
  height = DEFAULT_VIEWPORT_HEIGHT,
) => {
  if (!Number.isFinite(height)) {
    return state;
  }

  const totalRows = getLayout(state, width).visualLines.length;
  return {
    ...state,
    scrollRow: clampScrollRow(state.scrollRow + amount, totalRows, height),
    viewportMode: 'manual',
  };
};

export const clearSelection = (state: InputEditorState): InputEditorState => ({
  ...state,
  selection: null,
});

export const undo = (state: InputEditorState): InputEditorState => state;

export const redo = (state: InputEditorState): InputEditorState => state;
