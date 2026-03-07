import React, { memo, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import type { ChatMessage } from '../../shared/chat.js';
import { theme } from '../../shared/theme.js';
import { renderMarkdown } from '../../shared/markdown.js';

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

type TranscriptMessageProps = {
  msg: ChatMessage;
  isLastMessage: boolean;
  hasLoadingMessage: boolean;
};

const TranscriptMessage = memo<TranscriptMessageProps>(({
  msg,
  isLastMessage,
  hasLoadingMessage,
}) => {
  const marginBottom = !isLastMessage || hasLoadingMessage ? 1 : 0;

  return (
    <Box flexDirection="column" marginBottom={marginBottom}>
      {msg.role === 'user' ? (
        <Box flexDirection="row">
          <Text color={theme.chatUser}>{'❯ '}</Text>
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
            <Box key={lineIdx} flexDirection="row">
              {lineIdx === 0
                ? <Text color="#B43A6C">{'⏺ '}</Text>
                : <Text>{'  '}</Text>
              }
              <Box flexGrow={1}>
                <Text>{line}</Text>
              </Box>
            </Box>
          ))
      )}
    </Box>
  );
});

export const ChatPanel: React.FC<{
  transcript: ChatMessage[];
  loadingMessage?: string | null;
  loadingBlinking?: boolean;
}> = ({ transcript, loadingMessage, loadingBlinking = true }) => {
  const items = useMemo(
    () => transcript.map((msg, idx) => ({
      id: `${idx}-${msg.role}`,
      msg,
      isLastMessage: idx === transcript.length - 1,
    })),
    [transcript],
  );

  return (
    <Box flexDirection="column" flexGrow={1} marginBottom={1} paddingX={1}>
      {items.map((item) => (
        <TranscriptMessage
          key={item.id}
          msg={item.msg}
          isLastMessage={item.isLastMessage}
          hasLoadingMessage={Boolean(loadingMessage)}
        />
      ))}

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
};
