import React from 'react';
import { Box, useApp, useStdout } from 'ink';
import type { ChatMessage } from '../shared/chat.js';
import { readConfig } from '../services/storage/configStore.js';
import { WelcomePanel } from './components/WelcomePanel.js';
import { ChatPanel } from './components/ChatPanel.js';
import { SessionsModal } from './components/SessionsModal.js';
import { InputBox } from './components/InputBox.js';
import { TerminalProvider } from './contexts/TerminalContext.js';
import { UIActionsProvider } from './contexts/UIActionsContext.js';
import { UIStateProvider } from './contexts/UIStateContext.js';
import { useChatAppState } from './hooks/useChatAppState.js';

export const App: React.FC<{
  sessionId: string;
  initialTranscript?: ChatMessage[];
  onAuthAction: (action: 'login' | 'logout') => void;
}> = ({ sessionId, initialTranscript = [], onAuthAction }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const {
    currentSessionId,
    transcript,
    loading,
    loadingState,
    sessionsOpen,
    rewindOpen,
    rewindEntries,
    rewindSelectedIndex,
    modelPickerOpen,
    modelPickerStage,
    modelPickerLoading,
    modelPickerError,
    filteredModelOptions,
    modelSelectedIndex,
    modelQuery,
    modelEffortOptions,
    handleSend,
    handleInterrupt,
    handleCommand,
    handleModelMove,
    handleModelSelect,
    handleModelClose,
    handleModelQueryChange,
    handleSessionResume,
    handleSessionRename,
    handleSessionDelete,
    handleSessionsClose,
    handleRewindOpen,
    handleRewindClose,
    handleRewindMove,
    handleRewindSelect,
  } = useChatAppState({
    sessionId,
    initialTranscript,
    onAuthAction,
    onExit: exit,
  });

  const currentConfig = readConfig();

  const uiState = {
    sessionsOpen,
    rewindOpen,
    rewindEntries,
    rewindSelectedIndex,
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
    onRewindOpen: handleRewindOpen,
    onRewindClose: handleRewindClose,
    onRewindMove: handleRewindMove,
    onRewindSelect: handleRewindSelect,
    onModelMove: handleModelMove,
    onModelSelect: handleModelSelect,
    onModelClose: handleModelClose,
    onModelQueryChange: handleModelQueryChange,
  };

  return (
    <TerminalProvider value={{ columns: stdout.columns ?? 80, rows: stdout.rows ?? 24 }}>
      <UIStateProvider value={uiState}>
        <UIActionsProvider value={uiActions}>
          <Box flexDirection="column">
            <WelcomePanel />
            <ChatPanel
              transcript={transcript}
              loadingMessage={loading ? loadingState?.message ?? 'thinking…' : null}
              loadingBlinking={loading ? loadingState?.blinking ?? true : false}
            />
            <InputBox
              onSend={handleSend}
              loading={loading}
              onInterrupt={handleInterrupt}
              onCommand={handleCommand}
            />
            {sessionsOpen && (
              <SessionsModal
                currentSessionId={currentSessionId}
                onResume={handleSessionResume}
                onRename={handleSessionRename}
                onDelete={handleSessionDelete}
                onClose={handleSessionsClose}
              />
            )}
          </Box>
        </UIActionsProvider>
      </UIStateProvider>
    </TerminalProvider>
  );
};
