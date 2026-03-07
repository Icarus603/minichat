import React from 'react';
import { Box, Text, useStdout } from 'ink';
import type { ModelOption, ReasoningEffort } from '../../services/llm/modelCapabilities.js';
import { getVisibleWindow } from './popupViewport.js';

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
  const { stdout } = useStdout();
  const maxLen = models.reduce((m, model) => Math.max(m, model.id.length), 0);
  const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 10));
  const visibleModelWindow = getVisibleWindow(models, selectedIndex, maxVisibleItems);
  const visibleEffortWindow = getVisibleWindow(effortOptions, selectedIndex, maxVisibleItems);

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
        <>
          {visibleEffortWindow.startIndex > 0 && <Text color="#555">…</Text>}
          {visibleEffortWindow.visibleItems.map((effort, idx) => {
            const absoluteIndex = visibleEffortWindow.startIndex + idx;
            return (
          <Box key={effort} flexDirection="row">
            <Text color={absoluteIndex === selectedIndex ? '#B43A6C' : '#555'}>
              {absoluteIndex === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={absoluteIndex === selectedIndex ? '#FFF' : '#888'} bold={absoluteIndex === selectedIndex}>
              {effort}
            </Text>
            <Text color={effort === currentReasoningEffort ? '#B43A6C' : '#555'}>
              {effort === currentReasoningEffort ? '  current' : ''}
            </Text>
          </Box>
            );
          })}
          {visibleEffortWindow.startIndex + visibleEffortWindow.visibleItems.length < effortOptions.length && (
            <Text color="#555">…</Text>
          )}
        </>
      ) : (
        <>
          {visibleModelWindow.startIndex > 0 && <Text color="#555">…</Text>}
          {visibleModelWindow.visibleItems.map((model, idx) => {
            const absoluteIndex = visibleModelWindow.startIndex + idx;
            return (
          <Box key={model.id} flexDirection="row">
            <Text color={absoluteIndex === selectedIndex ? '#B43A6C' : '#555'}>
              {absoluteIndex === selectedIndex ? '❯ ' : '  '}
            </Text>
            <Text color={absoluteIndex === selectedIndex ? '#FFF' : '#888'} bold={absoluteIndex === selectedIndex}>
              {model.id.padEnd(maxLen)}
            </Text>
            <Text color={model.id === currentModel ? '#B43A6C' : '#555'}>
              {model.id === currentModel ? '  current' : ''}
            </Text>
          </Box>
            );
          })}
          {visibleModelWindow.startIndex + visibleModelWindow.visibleItems.length < models.length && (
            <Text color="#555">…</Text>
          )}
        </>
      )}
    </Box>
  );
};
