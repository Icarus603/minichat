import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { CommandDefinition as Command } from '../../app/commands/types.js';
import { getVisibleWindow } from './popupViewport.js';

export const CommandPalette: React.FC<{
  query: string;
  commands: Command[];
  selectedIndex: number;
}> = ({ query, commands, selectedIndex }) => {
  const { stdout } = useStdout();
  const maxLen = commands.reduce((m, c) => Math.max(m, c.name.length), 0);
  const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 8));
  const { visibleItems, startIndex } = getVisibleWindow(commands, selectedIndex, maxVisibleItems);
  const hasHiddenAbove = startIndex > 0;
  const hasHiddenBelow = startIndex + visibleItems.length < commands.length;

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      {commands.length === 0 ? (
        <Text color="#555">No match for &apos;{query}&apos;</Text>
      ) : (
        <>
          {hasHiddenAbove && <Text color="#555">…</Text>}
          {visibleItems.map((cmd, idx) => {
            const absoluteIndex = startIndex + idx;
            return (
          <Box key={cmd.name} flexDirection="row">
            <Text color={absoluteIndex === selectedIndex ? '#B43A6C' : '#555'}>
              {absoluteIndex === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={absoluteIndex === selectedIndex ? '#FFF' : '#888'} bold={absoluteIndex === selectedIndex}>
              {cmd.name.padEnd(maxLen)}
            </Text>
            <Text color="#555">{'  '}{cmd.description}</Text>
          </Box>
            );
          })}
          {hasHiddenBelow && <Text color="#555">…</Text>}
        </>
      )}
    </Box>
  );
};
