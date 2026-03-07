import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { RewindEntry } from '../../app/controller/sessionController.js';
import { getVisibleWindow } from './popupViewport.js';

export const RewindPalette: React.FC<{
  entries: RewindEntry[];
  selectedIndex: number;
}> = ({ entries, selectedIndex }) => {
  const { stdout } = useStdout();
  const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 8));
  const { visibleItems, startIndex } = getVisibleWindow(entries, selectedIndex, maxVisibleItems);

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      <Text color="#888">Rewind history</Text>
      <Text color="#555">Enter rewind, ↑ ↓ move, Esc close.</Text>
      {startIndex > 0 && <Text color="#555">…</Text>}
      {visibleItems.map((entry, idx) => {
        const absoluteIndex = startIndex + idx;
        const isSelected = absoluteIndex === selectedIndex;
        const preview = entry.preview.length > 96 ? `${entry.preview.slice(0, 93)}...` : entry.preview;
        return (
          <Box key={`${entry.transcriptIndex}-${preview}`} flexDirection="row">
            <Text color={isSelected ? '#B43A6C' : '#555'}>
              {isSelected ? '❯ ' : '  '}
            </Text>
            <Text color={isSelected ? '#FFF' : '#888'} bold={isSelected}>
              {preview}
            </Text>
          </Box>
        );
      })}
      {startIndex + visibleItems.length < entries.length && <Text color="#555">…</Text>}
    </Box>
  );
};
