import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, useApp, useStdout } from 'ink';
import { readConfig } from '../services/storage/configStore.js';
import { WelcomePanel } from './components/WelcomePanel.js';
import { ChatPanel } from './components/ChatPanel.js';
import { SessionsModal } from './components/SessionsModal.js';
import { InputBox } from './components/InputBox.js';
import { TerminalProvider } from './contexts/TerminalContext.js';
import { UIActionsProvider } from './contexts/UIActionsContext.js';
import { UIStateProvider } from './contexts/UIStateContext.js';
import { useChatAppState } from './hooks/useChatAppState.js';
export const App = ({ sessionId, initialTranscript = [], onAuthAction }) => {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const { currentSessionId, transcript, loading, loadingState, sessionsOpen, modelPickerOpen, modelPickerStage, modelPickerLoading, modelPickerError, filteredModelOptions, modelSelectedIndex, modelQuery, modelEffortOptions, handleSend, handleInterrupt, handleCommand, handleModelMove, handleModelSelect, handleModelClose, handleModelQueryChange, handleSessionResume, handleSessionRename, handleSessionDelete, handleSessionsClose, } = useChatAppState({
        sessionId,
        initialTranscript,
        onAuthAction,
        onExit: exit,
    });
    const currentConfig = readConfig();
    const uiState = {
        sessionsOpen,
        modelPickerOpen,
        modelPickerStage,
        modelPickerLoading,
        modelPickerError,
        modelOptions: filteredModelOptions,
        modelSelectedIndex,
        currentModel: currentConfig?.model ?? '',
        currentReasoningEffort: currentConfig?.reasoningEffort,
        modelQuery,
        modelEffortOptions,
    };
    const uiActions = {
        onModelMove: handleModelMove,
        onModelSelect: handleModelSelect,
        onModelClose: handleModelClose,
        onModelQueryChange: handleModelQueryChange,
    };
    return (_jsx(TerminalProvider, { value: { columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 }, children: _jsx(UIStateProvider, { value: uiState, children: _jsx(UIActionsProvider, { value: uiActions, children: _jsxs(Box, { flexDirection: "column", children: [_jsx(WelcomePanel, {}), _jsx(ChatPanel, { transcript: transcript, loadingMessage: loading ? loadingState?.message ?? 'thinking…' : null, loadingBlinking: loading ? loadingState?.blinking ?? true : false }), _jsx(InputBox, { onSend: handleSend, loading: loading, onInterrupt: handleInterrupt, onCommand: handleCommand }), sessionsOpen && (_jsx(SessionsModal, { currentSessionId: currentSessionId, onResume: handleSessionResume, onRename: handleSessionRename, onDelete: handleSessionDelete, onClose: handleSessionsClose }))] }) }) }) }));
};
