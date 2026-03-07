import React, { useState } from 'react';
import { Box, useApp } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { ChatPanel } from './ChatPanel.js';
import { InputBox } from './InputBox.js';
import { ResumeModal } from './ResumeModal.js';
import type { ChatMessage } from '../core/chatManager.js';
import { getConfig } from '../core/configManager.js';
import { saveConfig } from '../core/configManager.js';
import { chat } from '../core/openaiClient.js';
import { saveTranscript } from '../core/transcriptManager.js';
import { listAvailableModels, type ModelOption } from '../core/modelCatalog.js';

const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');

export const App: React.FC<{
  resumeMode: boolean;
  onAuthAction: (action: 'login' | 'logout') => void;
}> = ({ resumeMode, onAuthAction }) => {
  const { exit } = useApp();
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerLoading, setModelPickerLoading] = useState(false);
  const [modelPickerError, setModelPickerError] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelSelectedIndex, setModelSelectedIndex] = useState(0);

  const handleSend = async (input: string) => {
    const userMsg: ChatMessage = { role: 'user', content: input };
    const updated = [...transcript, userMsg];
    setTranscript(updated);
    setLoading(true);

    try {
      const config = getConfig()!;
      const response = await chat(updated, config);
      const aiMsg: ChatMessage = { role: 'ai', content: response };
      const final = [...updated, aiMsg];
      setTranscript(final);
      saveTranscript(SESSION_ID, final);
    } catch (err) {
      const errMsg: ChatMessage = {
        role: 'ai',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
      };
      setTranscript([...updated, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const openModelPicker = async () => {
    const config = getConfig();
    if (!config) {
      return;
    }

    setModelPickerOpen(true);
    setModelPickerLoading(true);
    setModelPickerError(null);

    try {
      const models = await listAvailableModels(config);
      setModelOptions(models);
      const currentIndex = models.findIndex(model => model.id === config.model);
      setModelSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
    } catch (error) {
      setModelOptions([]);
      setModelSelectedIndex(0);
      setModelPickerError(error instanceof Error ? error.message : String(error));
    } finally {
      setModelPickerLoading(false);
    }
  };

  const handleCommand = (cmd: string) => {
    if (cmd === '/model') {
      void openModelPicker();
      return;
    }

    if (cmd === '/login' || cmd === '/logout') {
      onAuthAction(cmd === '/login' ? 'login' : 'logout');
      return;
    }

    if (cmd === '/clear') {
      setTranscript([]);
    } else if (cmd === '/quit' || cmd === '/exit') {
      exit();
    }
  };

  const handleModelMove = (direction: -1 | 1) => {
    setModelSelectedIndex(index => {
      if (modelOptions.length === 0) {
        return 0;
      }

      return Math.max(0, Math.min(modelOptions.length - 1, index + direction));
    });
  };

  const handleModelClose = () => {
    setModelPickerOpen(false);
    setModelPickerLoading(false);
    setModelPickerError(null);
    setModelOptions([]);
    setModelSelectedIndex(0);
  };

  const handleModelSelect = () => {
    const config = getConfig();
    const selectedModel = modelOptions[modelSelectedIndex];

    if (!config || !selectedModel) {
      handleModelClose();
      return;
    }

    saveConfig({
      ...config,
      model: selectedModel.id,
    });

    setTranscript(current => [
      ...current,
      { role: 'ai', content: `Switched model to ${selectedModel.id}.` },
    ]);

    handleModelClose();
  };

  return (
    <Box flexDirection="column">
      <WelcomePanel />
      {resumeMode ? (
        <ResumeModal />
      ) : (
        <>
          <ChatPanel transcript={transcript} loading={loading} />
          <InputBox
            onSend={handleSend}
            onCommand={handleCommand}
            modelPickerOpen={modelPickerOpen}
            modelPickerLoading={modelPickerLoading}
            modelPickerError={modelPickerError}
            modelOptions={modelOptions}
            modelSelectedIndex={modelSelectedIndex}
            currentModel={getConfig()?.model ?? ''}
            onModelMove={handleModelMove}
            onModelSelect={handleModelSelect}
            onModelClose={handleModelClose}
          />
        </>
      )}
    </Box>
  );
};
