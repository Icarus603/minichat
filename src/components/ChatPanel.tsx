import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../core/chatManager.js';
import { theme } from '../core/theme.js';
import { renderMarkdown } from '../core/markdown.js';

const BlinkingDot: React.FC = () => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => !v), 600);
    return () => clearInterval(t);
  }, []);
  return <Text color="#B43A6C">{visible ? '⏺ ' : '  '}</Text>;
};

export const ChatPanel: React.FC<{
  transcript: ChatMessage[];
  loading: boolean;
}> = ({ transcript, loading }) => (
  <Box flexDirection="column" flexGrow={1} marginBottom={1} paddingX={1}>
    {transcript.map((msg, idx) => {
      const isLastMessage = idx === transcript.length - 1;
      const marginBottom = !isLastMessage || loading ? 1 : 0;

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
          ) : (
            renderMarkdown(msg.content)
              .split('\n')
              .map((line, lineIdx) => (
                <Box key={lineIdx} flexDirection="row">
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

    {loading && (
      <Box flexDirection="row">
        <BlinkingDot />
        <Text color="#888">thinking…</Text>
      </Box>
    )}
  </Box>
);
