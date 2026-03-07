import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput, useStdin } from 'ink';
import type { Key } from 'ink';
import { theme } from '../core/theme.js';
import { CommandPalette } from './CommandPalette.js';
import { ModelPalette } from './ModelPalette.js';
import { filterCommands } from '../core/commandParser.js';
import type { ModelOption, ReasoningEffort } from '../core/modelCatalog.js';
import {
  backspace,
  clearEditor,
  createInputEditorState,
  deleteForward,
  getRenderedLines,
  insertText,
  moveDown,
  moveLeft,
  moveRight,
  moveUp,
  type InputEditorState,
} from '../core/inputEditor.js';

const DOUBLE_ESCAPE_MS = 400;
const BACKSPACE_SEQUENCES = new Set(['\b', '\x7f']);
const FORWARD_DELETE_SEQUENCES = new Set(['\x1b[3~']);

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
  const lastEscapeAtRef = useRef(0);
  const lastSequenceRef = useRef('');
  const { stdin } = useStdin();

  const paletteQuery = editor.value.startsWith('/') ? editor.value.slice(1) : '';
  const commands = filterCommands(paletteQuery);

  const commitEditor = (nextEditor: InputEditorState) => {
    setEditor(nextEditor);
  };

  useEffect(() => {
    const handleData = (data: Buffer | string) => {
      lastSequenceRef.current = typeof data === 'string' ? data : data.toString('utf8');
    };

    stdin.on('data', handleData);
    return () => {
      stdin.off('data', handleData);
    };
  }, [stdin]);

  useInput((input: string, key: Key) => {
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
      if (key.upArrow) {
        onModelMove(-1);
        return;
      }

      if (key.downArrow) {
        onModelMove(1);
        return;
      }

      if (key.return && !modelPickerLoading) {
        onModelSelect();
        return;
      }

      if (key.escape) {
        onModelClose();
        return;
      }

      if (backwardDelete) {
        if (modelPickerStage === 'model') {
          onModelQueryChange(modelQuery.slice(0, -1));
        }
        return;
      }

      if (
        modelPickerStage === 'model' &&
        input &&
        !key.ctrl &&
        !key.meta &&
        !key.return &&
        !key.tab
      ) {
        onModelQueryChange(modelQuery + input);
        return;
      }

      return;
    }

    if (showPalette) {
      if (key.upArrow) {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }

      if (key.downArrow) {
        setSelectedIndex((i) => Math.min(commands.length - 1, i + 1));
        return;
      }

      if (key.return) {
        const chosen = commands[selectedIndex];
        if (chosen) {
          setShowPalette(false);
          commitEditor(clearEditor());
          setSelectedIndex(0);
          onCommand(chosen.name);
        }
        return;
      }

      if (key.escape) {
        lastEscapeAtRef.current = 0;
        setShowPalette(false);
        commitEditor(clearEditor());
        setSelectedIndex(0);
        return;
      }

      if (backwardDelete) {
        const next = backspace(editor);
        commitEditor(next);
        setSelectedIndex(0);
        if (next.value === '') setShowPalette(false);
        return;
      }

      if (forwardDelete) {
        const next = deleteForward(editor);
        commitEditor(next);
        setSelectedIndex(0);
        if (next.value === '') setShowPalette(false);
        return;
      }

      if (key.leftArrow) {
        commitEditor(moveLeft(editor));
        return;
      }

      if (key.rightArrow) {
        commitEditor(moveRight(editor));
        return;
      }

      if (input && /^[a-zA-Z]$/.test(input)) {
        commitEditor(insertText(editor, input));
        setSelectedIndex(0);
        return;
      }

      return;
    }

    if (input === '/' && editor.value === '') {
      commitEditor(insertText(clearEditor(), '/'));
      setShowPalette(true);
      setSelectedIndex(0);
      return;
    }

    if (key.escape) {
      const now = Date.now();
      const isDoubleEscape = now - lastEscapeAtRef.current <= DOUBLE_ESCAPE_MS;
      lastEscapeAtRef.current = now;

      if (isDoubleEscape) {
        commitEditor(clearEditor());
        lastEscapeAtRef.current = 0;
      }

      return;
    }

    lastEscapeAtRef.current = 0;

    if (key.return && !key.shift) {
      const text = editor.value.trim();
      if (text) {
        onSend(text);
        commitEditor(clearEditor());
      }
      return;
    }

    if (key.return && key.shift) {
      commitEditor(insertText(editor, '\n'));
      return;
    }

    if (key.leftArrow) {
      commitEditor(moveLeft(editor));
      return;
    }

    if (key.rightArrow) {
      commitEditor(moveRight(editor));
      return;
    }

    if (key.upArrow) {
      commitEditor(moveUp(editor));
      return;
    }

    if (key.downArrow) {
      commitEditor(moveDown(editor));
      return;
    }

    if (backwardDelete) {
      commitEditor(backspace(editor));
      return;
    }

    if (forwardDelete) {
      commitEditor(deleteForward(editor));
      return;
    }

    if (input) {
      commitEditor(insertText(editor, input));
    }

    lastSequenceRef.current = '';
  });

  const { lines, cursorLineIndex, cursorColumn } = getRenderedLines(editor);

  return (
    <Box flexDirection="column">
      <Box
        borderStyle="single"
        borderLeft={false}
        borderRight={false}
        borderColor="#444"
        paddingX={1}
        flexDirection="column"
      >
        {lines.map((line, idx) => (
          <Box key={idx} flexDirection="row">
            {idx === 0
              ? <Text color="#888">{'❯ '}</Text>
              : <Text>{'  '}</Text>
            }
            {idx === cursorLineIndex ? (
              <Text color={theme.input}>
                {line.slice(0, cursorColumn)}
                <Text backgroundColor="#FFF" color="#000">
                  {line[cursorColumn] ?? ' '}
                </Text>
                {line.slice(cursorColumn + (cursorColumn < line.length ? 1 : 0))}
              </Text>
            ) : (
              <Text color={theme.input}>{line || ' '}</Text>
            )}
          </Box>
        ))}
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
