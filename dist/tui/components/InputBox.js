import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { theme } from '../../shared/theme.js';
import { CommandPalette } from './CommandPalette.js';
import { ModelPalette } from './ModelPalette.js';
import { RewindPalette } from './RewindPalette.js';
import { useInputController } from '../input/useInputController.js';
import { useUIActions } from '../contexts/UIActionsContext.js';
import { useUIState } from '../contexts/UIStateContext.js';
export const InputBox = ({ onSend, loading, onInterrupt, onCommand, }) => {
    const { sessionsOpen, rewindOpen, rewindEntries, rewindSelectedIndex, modelPickerOpen, modelPickerStage, modelPickerLoading, modelPickerError, modelOptions, modelSelectedIndex, currentModel, currentReasoningEffort, modelQuery, modelEffortOptions, } = useUIState();
    const { onModelMove, onRewindOpen, onRewindClose, onRewindMove, onRewindSelect, onModelSelect, onModelClose, onModelQueryChange, } = useUIActions();
    const { editor: viewportEditor, showPalette, selectedIndex, viewportLines, viewportCursorLineIndex, viewportCursorCharIndex, viewportCursorColumn, scrollRow, useTerminalCursor, paletteQuery, commands, } = useInputController({
        onSend,
        loading,
        onInterrupt,
        onCommand,
        sessionsOpen,
        rewindOpen,
        modelPickerOpen,
        modelPickerStage,
        modelPickerLoading,
        modelOptions,
        modelSelectedIndex,
        modelQuery,
        modelEffortOptions,
        onRewindOpen,
        onRewindClose,
        onRewindMove,
        onRewindSelect,
        onModelMove,
        onModelSelect,
        onModelClose,
        onModelQueryChange,
    });
    const renderCursorLine = (line, charIndex) => {
        const chars = Array.from(line);
        const safeIndex = Math.max(0, Math.min(charIndex, chars.length));
        const currentChar = chars[safeIndex] ?? ' ';
        return (chars.slice(0, safeIndex).join('') +
            chalk.inverse(currentChar) +
            chars.slice(safeIndex + (safeIndex < chars.length ? 1 : 0)).join(''));
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Box, { borderStyle: "single", borderLeft: false, borderRight: false, borderColor: "#444", paddingX: 1, flexDirection: "column", children: [viewportLines.map((line, idx) => (_jsxs(Box, { flexDirection: "row", children: [idx === 0 ? _jsx(Text, { color: "#888", children: '❯ ' }) : _jsx(Text, { children: '  ' }), idx === viewportCursorLineIndex ? (_jsx(Text, { color: theme.input, terminalCursorFocus: useTerminalCursor, terminalCursorPosition: useTerminalCursor ? viewportCursorColumn : undefined, children: renderCursorLine(line, viewportCursorCharIndex) })) : (_jsx(Text, { color: theme.input, children: line || ' ' }))] }, idx))), scrollRow > 0 && (_jsx(Box, { children: _jsx(Text, { color: "#666", dimColor: true, children: `  ${scrollRow} more line${scrollRow === 1 ? '' : 's'} above` }) }))] }), showPalette && (_jsx(CommandPalette, { query: paletteQuery, commands: commands, selectedIndex: selectedIndex })), rewindOpen && (_jsx(RewindPalette, { entries: rewindEntries, selectedIndex: rewindSelectedIndex })), modelPickerOpen && (_jsx(ModelPalette, { stage: modelPickerStage, models: modelOptions, selectedIndex: modelSelectedIndex, currentModel: currentModel, currentReasoningEffort: currentReasoningEffort, loading: modelPickerLoading, error: modelPickerError, query: modelQuery, effortOptions: modelEffortOptions }))] }));
};
