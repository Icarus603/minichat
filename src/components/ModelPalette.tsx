import React from 'react';
import { Box, Text } from 'ink';
import type { ModelOption } from '../core/modelCatalog.js';

export const ModelPalette: React.FC<{
  models: ModelOption[];
  selectedIndex: number;
  currentModel: string;
  loading: boolean;
  error: string | null;
}> = ({ models, selectedIndex, currentModel, loading, error }) => {
  const maxLen = models.reduce((m, model) => Math.max(m, model.id.length), 0);

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      <Text color="#888">Select model</Text>
      {loading ? (
        <Text color="#555">Loading models…</Text>
      ) : error ? (
        <Text color="#B43A6C">{error}</Text>
      ) : models.length === 0 ? (
        <Text color="#555">No models available for this login.</Text>
      ) : (
        models.map((model, idx) => (
          <Box key={model.id} flexDirection="row">
            <Text color={idx === selectedIndex ? '#B43A6C' : '#555'}>
              {idx === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={idx === selectedIndex ? '#FFF' : '#888'} bold={idx === selectedIndex}>
              {model.id.padEnd(maxLen)}
            </Text>
            <Text color={model.id === currentModel ? '#B43A6C' : '#555'}>
              {model.id === currentModel ? '  current' : ''}
            </Text>
          </Box>
        ))
      )}
    </Box>
  );
};
