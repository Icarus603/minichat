import React, { useState } from 'react';
import { Box, useApp } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { ChatPanel } from './ChatPanel.js';
import { InputBox } from './InputBox.js';
import { ResumeModal } from './ResumeModal.js';
import type { ChatMessage } from '../core/chatManager.js';
import { getConfig } from '../core/configManager.js';
import { chat } from '../core/openaiClient.js';
import { saveTranscript } from '../core/transcriptManager.js';

const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');

export const App: React.FC<{ resumeMode: boolean }> = ({ resumeMode }) => {
  const { exit } = useApp();
  const [transcript, setTranscript] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleCommand = (cmd: string) => {
    if (cmd === '/clear') {
      setTranscript([]);
    } else if (cmd === '/quit' || cmd === '/exit') {
      exit();
    }
  };

  return (
    <Box flexDirection="column">
      <WelcomePanel />
      {resumeMode ? (
        <ResumeModal />
      ) : (
        <>
          <ChatPanel transcript={transcript} loading={loading} />
          <InputBox onSend={handleSend} onCommand={handleCommand} />
        </>
      )}
    </Box>
  );
};
