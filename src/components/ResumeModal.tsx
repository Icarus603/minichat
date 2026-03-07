import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { listTranscripts, type TranscriptSummary } from '../core/transcriptManager.js';
import { getVisibleWindow } from './popupViewport.js';

export const ResumeModal: React.FC<{
  onSelect: (transcriptId: string | null) => void;
}> = ({ onSelect }) => {
  const { stdout } = useStdout();
  const history = listTranscripts();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const maxVisibleItems = Math.max(2, Math.min(4, Math.floor(((stdout?.rows ?? 24) - 10) / 3)));
  const { visibleItems, startIndex } = getVisibleWindow(history, selectedIndex, maxVisibleItems);

  useInput((input, key) => {
    if (key.escape) {
      onSelect(null);
      return;
    }

    if (history.length === 0) {
      if (key.return) {
        onSelect(null);
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(history.length - 1, index + 1));
      return;
    }

    if (key.return) {
      onSelect(history[selectedIndex]?.id ?? null);
      return;
    }

    if (/^[1-9]$/.test(input)) {
      const index = Number(input) - 1;
      if (index < history.length) {
        setSelectedIndex(index);
      }
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#666" padding={1} margin={2}>
      <Text bold color="#FFF">Resume Conversation</Text>
      <Text color="#AAA">Select a transcript to restore, or press Esc to cancel.</Text>
      {history.length === 0 && (
        <Text color="#555">No saved conversations. Press Enter or Esc to continue.</Text>
      )}
      {startIndex > 0 && <Text color="#555">…</Text>}
      {visibleItems.map((item: TranscriptSummary, index) => {
        const absoluteIndex = startIndex + index;
        const selected = absoluteIndex === selectedIndex;
        return (
          <Box key={item.id} flexDirection="column" marginTop={1}>
            <Text color={selected ? '#B43A6C' : '#FFF'}>
              {`${selected ? '>' : ' '} ${absoluteIndex + 1}. ${item.name}`}
              <Text color="#777">{`  ${item.date}`}</Text>
            </Text>
            <Text color="#777">{`   ${item.preview}`}</Text>
            <Text color="#555">{`   ${item.messageCount} messages`}</Text>
          </Box>
        );
      })}
      {startIndex + visibleItems.length < history.length && <Text color="#555">…</Text>}
    </Box>
  );
};
