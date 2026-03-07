import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput, useStdin, useStdout } from 'ink';
import type { Key } from 'ink';
import chalk from 'chalk';
import { theme } from '../../core/theme.js';
import { CommandPalette } from '../../components/CommandPalette.js';
import { ModelPalette } from '../../components/ModelPalette.js';
import { filterCommands } from '../../core/commandParser.js';
import type { ModelOption, ReasoningEffort } from '../../core/modelCatalog.js';
import {
  backspace,
  clearEditor,
  createInputEditorState,
  deleteForward,
  getRenderedLines,
  getViewportRenderedLines,
  insertText,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  revealPasteStart,
  setViewportSize,
  type InputEditorState,
} from '../input/textBuffer.js';

const DOUBLE_ESCAPE_MS = 400;
const BACKSPACE_SEQUENCES = new Set(['\b', '\x7f']);
const FORWARD_DELETE_SEQUENCES = new Set(['\x1b[3~']);
const BRACKETED_PASTE_START = '\x1b[200~';
const BRACKETED_PASTE_END = '\x1b[201~';
const LARGE_PASTE_LINE_THRESHOLD = 5;
const LARGE_PASTE_CHAR_THRESHOLD = 500;

const isLargePaste = (text: string) =>
  text.split('\n').length > LARGE_PASTE_LINE_THRESHOLD || text.length > LARGE_PASTE_CHAR_THRESHOLD;

const createPastePlaceholder = (text: string, existing: Record<string, string>) => {
  const lineCount = text.split('\n').length;
  const base =
    lineCount > LARGE_PASTE_LINE_THRESHOLD
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

const expandPastePlaceholders = (text: string, pastedContent: Record<string, string>) => {
  let expanded = text;
  for (const [placeholder, content] of Object.entries(pastedContent)) {
    expanded = expanded.split(placeholder).join(content);
  }
  return expanded;
};

export const InputBox: React.FC<{
  onSend: (input: string) => void;
  loading: boolean;
  onInterrupt: () => void;
  onCommand: (cmd: string) => void;
  sessionsOpen: boolean;
  modelPickerOpen: boolean;
  modelPickerStage: 'model' | 'effort';
  modelPickerLoading: boolean;
  modelPickerError: string | null;
  modelOptions: ModelOption[];
  modelSelectedIndex: number;
  currentModel: string;
  currentReasoningEffort?: ReasoningEffort;
  modelQuery: string;
  modelEffortOptions: ReasoningEffort[];
  onModelMove: (direction: -1 | 1) => void;
  onModelSelect: () => void;
  onModelClose: () => void;
  onModelQueryChange: (query: string) => void;
}> = ({
  onSend,
  loading,
  onInterrupt,
  onCommand,
  sessionsOpen,
  modelPickerOpen,
  modelPickerStage,
  modelPickerLoading,
  modelPickerError,
  modelOptions,
  modelSelectedIndex,
  currentModel,
  currentReasoningEffort,
  modelQuery,
  modelEffortOptions,
  onModelMove,
  onModelSelect,
  onModelClose,
  onModelQueryChange,
}) => {
  const [editor, setEditor] = useState<InputEditorState>(createInputEditorState());
  const [showPalette, setShowPalette] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pastedContent, setPastedContent] = useState<Record<string, string>>({});
  const editorRef = useRef(editor);
  const pastedContentRef = useRef(pastedContent);
  const lastEscapeAtRef = useRef(0);
  const lastSequenceRef = useRef('');
  const rawPasteBufferRef = useRef('');
  const bracketedPasteBufferRef = useRef('');
  const bufferingBracketedPasteRef = useRef(false);
  const suppressRegularInputUntilRef = useRef(0);
  const { stdin } = useStdin();
  const { stdout } = useStdout();

  const paletteQuery = editor.value.startsWith('/') ? editor.value.slice(1) : '';
  const commands = filterCommands(paletteQuery);

  const commitEditor = (nextEditor: InputEditorState) => {
    editorRef.current = nextEditor;
    setEditor(nextEditor);
  };

  const commitPastedContent = (nextPastedContent: Record<string, string>) => {
    pastedContentRef.current = nextPastedContent;
    setPastedContent(nextPastedContent);
  };

  const applyPastedText = (text: string) => {
    const currentEditor = editorRef.current;
    const currentPastedContent = pastedContentRef.current;
    const textToInsert =
      isLargePaste(text)
        ? createPastePlaceholder(text, currentPastedContent)
        : text;

    if (textToInsert !== text) {
      commitPastedContent({
        ...currentPastedContent,
        [textToInsert]: text,
      });
    }

    const inserted = insertText(currentEditor, textToInsert);
    const sized = setViewportSize(inserted, inputWidth, inputHeight);
    const next = textToInsert === text
      ? revealPasteStart(currentEditor, sized, inputWidth, inputHeight)
      : sized;
    commitEditor(next);
    suppressRegularInputUntilRef.current = Date.now() + 50;
  };

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    pastedContentRef.current = pastedContent;
  }, [pastedContent]);

  useEffect(() => {
    const handleData = (data: Buffer | string) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      lastSequenceRef.current = raw;

      rawPasteBufferRef.current += raw;

      while (rawPasteBufferRef.current.length > 0) {
        if (!bufferingBracketedPasteRef.current) {
          const startIndex = rawPasteBufferRef.current.indexOf(BRACKETED_PASTE_START);
          if (startIndex === -1) {
            rawPasteBufferRef.current = rawPasteBufferRef.current.slice(-(BRACKETED_PASTE_START.length - 1));
            return;
          }

          bufferingBracketedPasteRef.current = true;
          bracketedPasteBufferRef.current = '';
          rawPasteBufferRef.current = rawPasteBufferRef.current.slice(startIndex + BRACKETED_PASTE_START.length);
        }

        const endIndex = rawPasteBufferRef.current.indexOf(BRACKETED_PASTE_END);
        if (endIndex === -1) {
          bracketedPasteBufferRef.current += rawPasteBufferRef.current;
          rawPasteBufferRef.current = '';
          return;
        }

        bracketedPasteBufferRef.current += rawPasteBufferRef.current.slice(0, endIndex);
        const pastedText = bracketedPasteBufferRef.current;
        rawPasteBufferRef.current = rawPasteBufferRef.current.slice(endIndex + BRACKETED_PASTE_END.length);
        bufferingBracketedPasteRef.current = false;
        bracketedPasteBufferRef.current = '';

        if (pastedText.length > 0) {
          applyPastedText(pastedText);
        }
      }
    };

    stdin.on('data', handleData);
    return () => {
      stdin.off('data', handleData);
    };
  }, [stdin]);

  useInput((input: string, key: Key) => {
    if (bufferingBracketedPasteRef.current || Date.now() < suppressRegularInputUntilRef.current) {
      return;
    }

    const currentEditor = editorRef.current;
    const currentPastedContent = pastedContentRef.current;
    const sequence = lastSequenceRef.current;
    const backwardDelete = BACKSPACE_SEQUENCES.has(sequence) || key.backspace || input === '\b' || input === '\x7f';
    const forwardDelete = FORWARD_DELETE_SEQUENCES.has(sequence) || (key.delete && !backwardDelete);

    if (loading && key.escape) {
      onInterrupt();
      return;
    }

    if (sessionsOpen) {
      return;
    }

    if (modelPickerOpen) {
      if (key.upArrow) return void onModelMove(-1);
      if (key.downArrow) return void onModelMove(1);
      if (key.return && !modelPickerLoading) return void onModelSelect();
      if (key.escape) return void onModelClose();

      if (backwardDelete) {
        if (modelPickerStage === 'model') {
          onModelQueryChange(modelQuery.slice(0, -1));
        }
        return;
      }

      if (modelPickerStage === 'model' && input && !key.ctrl && !key.meta && !key.return && !key.tab) {
        onModelQueryChange(modelQuery + input);
      }
      return;
    }

    if (showPalette) {
      if (key.upArrow) return void setSelectedIndex((i) => Math.max(0, i - 1));
      if (key.downArrow) return void setSelectedIndex((i) => Math.min(commands.length - 1, i + 1));

      if (key.return) {
        const chosen = commands[selectedIndex];
        if (chosen) {
          setShowPalette(false);
          commitEditor(clearEditor());
          commitPastedContent({});
          setSelectedIndex(0);
          onCommand(chosen.name);
        }
        return;
      }

      if (key.escape) {
        lastEscapeAtRef.current = 0;
        setShowPalette(false);
        commitEditor(clearEditor());
        commitPastedContent({});
        setSelectedIndex(0);
        return;
      }

      if (backwardDelete) {
        const next = setViewportSize(backspace(currentEditor), inputWidth, inputHeight);
        commitEditor(next);
        setSelectedIndex(0);
        if (next.value === '') setShowPalette(false);
        return;
      }

      if (forwardDelete) {
        const next = setViewportSize(deleteForward(currentEditor), inputWidth, inputHeight);
        commitEditor(next);
        setSelectedIndex(0);
        if (next.value === '') setShowPalette(false);
        return;
      }

      if (key.leftArrow) return void commitEditor(setViewportSize(moveLeft(currentEditor), inputWidth, inputHeight));
      if (key.rightArrow) return void commitEditor(setViewportSize(moveRight(currentEditor), inputWidth, inputHeight));

      if (input && /^[a-zA-Z]$/.test(input)) {
        commitEditor(setViewportSize(insertText(currentEditor, input), inputWidth, inputHeight));
        setSelectedIndex(0);
      }
      return;
    }

    if (input === '/' && currentEditor.value === '') {
      commitEditor(setViewportSize(insertText(clearEditor(), '/'), inputWidth, inputHeight));
      setShowPalette(true);
      setSelectedIndex(0);
      return;
    }

    if (key.escape) {
      const now = Date.now();
      const isDoubleEscape = now - lastEscapeAtRef.current <= DOUBLE_ESCAPE_MS;
      lastEscapeAtRef.current = now;

      if (isDoubleEscape) {
        commitEditor(setViewportSize(clearEditor(), inputWidth, inputHeight));
        commitPastedContent({});
        lastEscapeAtRef.current = 0;
      }
      return;
    }

    lastEscapeAtRef.current = 0;

    if (key.return && !key.shift) {
      const text = expandPastePlaceholders(currentEditor.value, currentPastedContent).trim();
      if (text) {
        onSend(text);
        commitEditor(setViewportSize(clearEditor(), inputWidth, inputHeight));
        commitPastedContent({});
      }
      return;
    }

    if (key.return && key.shift) return void commitEditor(setViewportSize(insertText(currentEditor, '\n'), inputWidth, inputHeight));
    if (key.leftArrow) return void commitEditor(setViewportSize(moveLeft(currentEditor), inputWidth, inputHeight));
    if (key.rightArrow) return void commitEditor(setViewportSize(moveRight(currentEditor), inputWidth, inputHeight));
    if (key.upArrow) return void commitEditor(setViewportSize(moveUp(currentEditor, inputWidth), inputWidth, inputHeight));
    if (key.downArrow) return void commitEditor(setViewportSize(moveDown(currentEditor, inputWidth), inputWidth, inputHeight));
    if (backwardDelete) return void commitEditor(setViewportSize(backspace(currentEditor), inputWidth, inputHeight));
    if (forwardDelete) return void commitEditor(setViewportSize(deleteForward(currentEditor), inputWidth, inputHeight));
    if (input) {
      const textToInsert =
        input.length > 1 && isLargePaste(input)
          ? createPastePlaceholder(input, currentPastedContent)
          : input;
      if (textToInsert !== input) {
        commitPastedContent({
          ...currentPastedContent,
          [textToInsert]: input,
        });
      }

      const inserted = insertText(currentEditor, textToInsert);
      const sized = setViewportSize(inserted, inputWidth, inputHeight);
      const next = textToInsert === input && (input.length > 1 || input.includes('\n'))
        ? revealPasteStart(currentEditor, sized, inputWidth, inputHeight)
        : sized;
      commitEditor(next);
    }

    lastSequenceRef.current = '';
  });

  const inputWidth = Math.max(1, (stdout.columns || 80) - 4);
  const fullRenderedLineCount = getRenderedLines(editor, inputWidth).lines.length;
  const inputHeight = Math.max(1, fullRenderedLineCount);
  const viewportEditor = setViewportSize(editor, inputWidth, inputHeight);
  const {
    viewportLines,
    viewportCursorLineIndex,
    viewportCursorCharIndex,
    viewportCursorColumn,
    scrollRow,
  } = getViewportRenderedLines(viewportEditor, inputWidth, inputHeight);
  const useTerminalCursor = viewportEditor.viewportMode !== 'manual';

  const renderCursorLine = (line: string, charIndex: number) => {
    const chars = Array.from(line);
    const safeIndex = Math.max(0, Math.min(charIndex, chars.length));
    const currentChar = chars[safeIndex] ?? ' ';

    return (
      chars.slice(0, safeIndex).join('') +
      chalk.inverse(currentChar) +
      chars.slice(safeIndex + (safeIndex < chars.length ? 1 : 0)).join('')
    );
  };

  return (
    <Box flexDirection="column">
      <Box borderStyle="single" borderLeft={false} borderRight={false} borderColor="#444" paddingX={1} flexDirection="column">
        {viewportLines.map((line, idx) => (
          <Box key={idx} flexDirection="row">
            {idx === 0 ? <Text color="#888">{'❯ '}</Text> : <Text>{'  '}</Text>}
            {idx === viewportCursorLineIndex ? (
              <Text
                color={theme.input}
                terminalCursorFocus={useTerminalCursor}
                terminalCursorPosition={useTerminalCursor ? viewportCursorColumn : undefined}
              >
                {renderCursorLine(line, viewportCursorCharIndex)}
              </Text>
            ) : (
              <Text color={theme.input}>{line || ' '}</Text>
            )}
          </Box>
        ))}
        {scrollRow > 0 && (
          <Box>
            <Text color="#666" dimColor>{`  ${scrollRow} more line${scrollRow === 1 ? '' : 's'} above`}</Text>
          </Box>
        )}
      </Box>

      {showPalette && (
        <CommandPalette
          query={paletteQuery}
          commands={commands}
          selectedIndex={selectedIndex}
        />
      )}

      {modelPickerOpen && (
        <ModelPalette
          stage={modelPickerStage}
          models={modelOptions}
          selectedIndex={modelSelectedIndex}
          currentModel={currentModel}
          currentReasoningEffort={currentReasoningEffort}
          loading={modelPickerLoading}
          error={modelPickerError}
          query={modelQuery}
          effortOptions={modelEffortOptions}
        />
      )}
    </Box>
  );
};
