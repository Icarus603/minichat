import React from 'react';
import { Box, Text } from 'ink';
import type { Command } from '../core/commandParser.js';

export const CommandPalette: React.FC<{
  query: string;
  commands: Command[];
  selectedIndex: number;
}> = ({ query, commands, selectedIndex }) => {
  const maxLen = commands.reduce((m, c) => Math.max(m, c.name.length), 0);

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      {commands.length === 0 ? (
        <Text color="#555">No match for &apos;{query}&apos;</Text>
      ) : (
        commands.map((cmd, idx) => (
          <Box key={cmd.name} flexDirection="row">
            <Text color={idx === selectedIndex ? '#B43A6C' : '#555'}>
              {idx === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={idx === selectedIndex ? '#FFF' : '#888'} bold={idx === selectedIndex}>
              {cmd.name.padEnd(maxLen)}
            </Text>
            <Text color="#555">{'  '}{cmd.description}</Text>
          </Box>
        ))
      )}
    </Box>
  );
};
