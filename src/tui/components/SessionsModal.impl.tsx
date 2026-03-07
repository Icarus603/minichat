import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import TextInput from 'ink-text-input';
import { listTranscripts, sanitizeTranscriptName, type TranscriptSummary } from '../../services/storage/transcriptStore.js';
import { getVisibleWindow } from './popupViewport.js';

export const SessionsModal: React.FC<{
  currentSessionId: string;
  onResume: (transcriptId: string) => void;
  onRename: (transcriptId: string, nextName: string) => boolean;
  onDelete: (transcriptId: string) => void;
  onClose: () => void;
}> = ({ currentSessionId, onResume, onRename, onDelete, onClose }) => {
  const { stdout } = useStdout();
  const [history, setHistory] = useState<TranscriptSummary[]>(() => listTranscripts());
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [renameMode, setRenameMode] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(listTranscripts());
  }, []);

  const selected = history[selectedIndex] ?? null;
  const maxVisibleItems = Math.max(2, Math.min(4, Math.floor(((stdout?.rows ?? 24) - 10) / 3)));
  const { visibleItems, startIndex } = getVisibleWindow(history, selectedIndex, maxVisibleItems);

  const refreshHistory = () => {
    const next = listTranscripts();
    setHistory(next);
    setSelectedIndex(index => Math.max(0, Math.min(next.length - 1, index)));
    return next;
  };

  useInput((input, key) => {
    if (renameMode) {
      if (key.escape) {
        setRenameMode(false);
        setRenameValue('');
        setError(null);
      }
      return;
    }

    if (key.escape) {
      onClose();
      return;
    }

    if (history.length === 0) {
      if (key.return) {
        onClose();
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(index => Math.max(0, index - 1));
      setError(null);
      return;
    }

    if (key.downArrow) {
      setSelectedIndex(index => Math.min(history.length - 1, index + 1));
      setError(null);
      return;
    }

    if (key.return && selected) {
      onResume(selected.id);
      return;
    }

    if ((input === 'r' || input === 'R') && selected) {
      setRenameMode(true);
      setRenameValue(selected.name);
      setError(null);
      return;
    }

    if ((input === 'd' || input === 'D') && selected) {
      onDelete(selected.id);
      const next = refreshHistory();
      if (next.length === 0) {
        onClose();
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      <Text color="#888">Sessions</Text>
      <Text color="#555">Enter resume, R rename, D delete, Esc close.</Text>
      {history.length === 0 && <Text color="#555">No saved conversations.</Text>}
      {startIndex > 0 && <Text color="#555">…</Text>}
      {visibleItems.map((item, index) => {
        const absoluteIndex = startIndex + index;
        const isSelected = absoluteIndex === selectedIndex;
        const isCurrent = item.id === currentSessionId;
        return (
          <Box key={item.id} flexDirection="column">
            <Text color={isSelected ? '#B43A6C' : '#FFF'}>
              {`${isSelected ? '❯' : ' '} ${item.name}`}
              <Text color={isCurrent ? '#B43A6C' : '#777'}>{isCurrent ? '  current' : `  ${item.date}`}</Text>
            </Text>
            <Text color="#777">{`   ${item.preview}`}</Text>
            <Text color="#555">{`   ${item.messageCount} messages`}</Text>
          </Box>
        );
      })}
      {startIndex + visibleItems.length < history.length && <Text color="#555">…</Text>}
      {renameMode && selected && (
        <Box flexDirection="column">
          <Text color="#888">Rename session</Text>
          <Box>
            <Text color="#B43A6C">{'> '}</Text>
            <TextInput
              value={renameValue}
              onChange={setRenameValue}
              onSubmit={(value) => {
                const nextName = sanitizeTranscriptName(value);
                if (!nextName) {
                  setError('Session name cannot be empty.');
                  return;
                }

                const renamed = onRename(selected.id, nextName);
                if (!renamed) {
                  setError('Could not rename session.');
                  return;
                }

                setRenameMode(false);
                setRenameValue('');
                setError(null);
                const next = refreshHistory();
                const renamedIndex = next.findIndex(item => item.id === nextName);
                if (renamedIndex >= 0) {
                  setSelectedIndex(renamedIndex);
                }
              }}
            />
          </Box>
          <Text color="#555">Press Esc to cancel rename.</Text>
        </Box>
      )}
      {error && <Text color="#B43A6C">{error}</Text>}
    </Box>
  );
};
