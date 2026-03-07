import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { theme } from '../../shared/theme.js';
import { CommandPalette } from './CommandPalette.js';
import { ModelPalette } from './ModelPalette.js';
import { useInputController } from '../input/useInputController.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useUIState } from '../contexts/UIStateContext.js';

export const InputBox: React.FC<{
  onSend: (input: string) => void;
  loading: boolean;
  onInterrupt: () => void;
  onCommand: (cmd: string) => void;
}> = ({
  onSend,
  loading,
  onInterrupt,
  onCommand,
}) => {
  const {
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
  } = useUIState();
  const {
    onModelMove,
    onModelSelect,
    onModelClose,
    onModelQueryChange,
  } = useUIActions();

  const {
    editor: viewportEditor,
    showPalette,
    selectedIndex,
    viewportLines,
    viewportCursorLineIndex,
    viewportCursorCharIndex,
    viewportCursorColumn,
    scrollRow,
    useTerminalCursor,
    paletteQuery,
    commands,
  } = useInputController({
    onSend,
    loading,
    onInterrupt,
    onCommand,
    sessionsOpen,
    modelPickerOpen,
    modelPickerStage,
    modelPickerLoading,
    modelOptions,
    modelSelectedIndex,
    modelQuery,
    modelEffortOptions,
    onModelMove,
    onModelSelect,
    onModelClose,
    onModelQueryChange,
  });

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
