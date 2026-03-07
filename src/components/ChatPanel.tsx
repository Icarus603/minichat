import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../core/chatManager.js';
import { theme } from '../core/theme.js';
import { renderMarkdown } from '../core/markdown.js';

const StatusDot: React.FC<{ blinking?: boolean }> = ({ blinking = false }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!blinking) {
      setVisible(true);
      return;
    }

    const t = setInterval(() => setVisible((v) => !v), 600);
    return () => clearInterval(t);
  }, [blinking]);

  return <Text color="#B43A6C">{visible ? '⏺ ' : '  '}</Text>;
};

export const ChatPanel: React.FC<{
  transcript: ChatMessage[];
  loadingMessage?: string | null;
  loadingBlinking?: boolean;
}> = ({ transcript, loadingMessage, loadingBlinking = true }) => (
  <Box flexDirection="column" flexGrow={1} marginBottom={1} paddingX={1}>
    {transcript.map((msg, idx) => {
      const isLastMessage = idx === transcript.length - 1;
      const marginBottom = !isLastMessage || Boolean(loadingMessage) ? 1 : 0;

      return (
        <Box key={idx} flexDirection="column" marginBottom={marginBottom}>
          {msg.role === 'user' ? (
            <Box flexDirection="row">
              <Text color={theme.chatUser}>{'❯ '}</Text>
              {/* flexGrow={1} constrains width so long messages wrap correctly */}
              <Box flexGrow={1}>
                <Text color={theme.chatUser}>{msg.content}</Text>
              </Box>
            </Box>
          ) : msg.role === 'status' ? (
            <Box flexDirection="row">
              <Text color="#B43A6C">{'⏺ '}</Text>
              <Box flexGrow={1}>
                <Text color="#B43A6C" dimColor>{msg.content}</Text>
              </Box>
            </Box>
          ) : (
            renderMarkdown(msg.content)
              .split('\n')
              .map((line, lineIdx) => (
                <Box key={`${idx}-${lineIdx}`} flexDirection="row">
                  {lineIdx === 0
                    ? <Text color="#B43A6C">{'⏺ '}</Text>
                    : <Text>{'  '}</Text>
                  }
                  {/* flexGrow={1} gives Ink a defined wrap width for each line */}
                  <Box flexGrow={1}>
                    <Text>{line}</Text>
                  </Box>
                </Box>
              ))
          )}
        </Box>
      );
    })}

    {loadingMessage && (
      <Box flexDirection="row">
        <StatusDot blinking={loadingBlinking} />
        {loadingMessage === 'thinking…' ? (
          <Text color="#888">{loadingMessage}</Text>
        ) : (
          <Text color="#B43A6C" dimColor>{loadingMessage}</Text>
        )}
      </Box>
    )}
  </Box>
);
