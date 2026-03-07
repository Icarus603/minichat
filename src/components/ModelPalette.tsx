import React from 'react';
import { Box, Text } from 'ink';
import type { ModelOption, ReasoningEffort } from '../core/modelCatalog.js';

export const ModelPalette: React.FC<{
  stage: 'model' | 'effort';
  models: ModelOption[];
  selectedIndex: number;
  currentModel: string;
  currentReasoningEffort?: ReasoningEffort;
  loading: boolean;
  error: string | null;
  query: string;
  effortOptions: ReasoningEffort[];
}> = ({
  stage,
  models,
  selectedIndex,
  currentModel,
  currentReasoningEffort,
  loading,
  error,
  query,
  effortOptions,
}) => {
  const maxLen = models.reduce((m, model) => Math.max(m, model.id.length), 0);

  return (
    <Box flexDirection="column" paddingLeft={1} marginTop={0}>
      <Text color="#888">{stage === 'model' ? 'Select model' : 'Select reasoning effort'}</Text>
      {stage === 'model' && (
        <Text color="#555">{`Filter: ${query || '(type to search)'}`}</Text>
      )}
      {stage === 'model' && loading ? (
        <Text color="#555">Loading models…</Text>
      ) : stage === 'model' && error ? (
        <Text color="#B43A6C">{error}</Text>
      ) : stage === 'model' && models.length === 0 ? (
        <Text color="#555">No models available for this login.</Text>
      ) : stage === 'effort' ? (
        effortOptions.map((effort, idx) => (
          <Box key={effort} flexDirection="row">
            <Text color={idx === selectedIndex ? '#B43A6C' : '#555'}>
              {idx === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={idx === selectedIndex ? '#FFF' : '#888'} bold={idx === selectedIndex}>
              {effort}
            </Text>
            <Text color={effort === currentReasoningEffort ? '#B43A6C' : '#555'}>
              {effort === currentReasoningEffort ? '  current' : ''}
            </Text>
          </Box>
        ))
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
