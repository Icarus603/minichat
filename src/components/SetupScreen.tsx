import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../core/theme.js';

export type SetupAction =
  | { type: 'chatgpt' }
  | { type: 'device' }
  | { type: 'openaiApiKey'; apiKey: string }
  | { type: 'openrouterApiKey'; apiKey: string };

const OPTIONS = [
  {
    id: 'chatgpt',
    title: 'Sign in with ChatGPT',
    description: 'Usage included with Plus, Pro, Business, and Enterprise plans',
  },
  {
    id: 'device',
    title: 'Sign in with Device Code',
    description: 'Sign in from another device with a one-time code',
  },
  {
    id: 'openaiApiKey',
    title: 'Use OpenAI API key',
    description: 'Use OpenAI-hosted API models with your own key',
  },
  {
    id: 'openrouterApiKey',
    title: 'Use OpenRouter API key',
    description: 'Use OpenRouter with OpenAI and other routed models',
  },
] as const;

export const SetupScreen: React.FC<{
  onDone: (action: SetupAction) => void;
}> = ({ onDone }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMode, setApiKeyMode] = useState<'openaiApiKey' | 'openrouterApiKey'>('openaiApiKey');

  const selectedOption = OPTIONS[selectedIndex];
  const subtitle = useMemo(() => {
    if (showApiKeyInput) {
      return `Paste or type your ${apiKeyMode === 'openrouterApiKey' ? 'OpenRouter' : 'OpenAI'} API key below. It will be stored locally in ~/.minichat/config.json.`;
    }

    return 'Sign in with ChatGPT to use MiniChat with your OpenAI account, or connect an OpenAI / OpenRouter API key for usage-based billing.';
  }, [apiKeyMode, showApiKeyInput]);

  useInput((input, key) => {
    if (showApiKeyInput) {
      if (key.escape) {
        setShowApiKeyInput(false);
        setApiKey('');
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((index) => Math.max(0, index - 1));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((index) => Math.min(OPTIONS.length - 1, index + 1));
      return;
    }

    if (input === '1' || input === '2' || input === '3' || input === '4') {
      setSelectedIndex(Number(input) - 1);
      return;
    }

    if (key.return) {
      if (selectedOption.id === 'openaiApiKey' || selectedOption.id === 'openrouterApiKey') {
        setApiKeyMode(selectedOption.id);
        setShowApiKeyInput(true);
        return;
      }

      onDone({ type: selectedOption.id });
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor={theme.welcomeBorder}
        paddingLeft={1}
        marginBottom={2}
        width={29}
      >
        <Text>
          <Text color={theme.welcomeIcon}>{'✻  '}</Text>
          <Text color={theme.welcomeText}>{'Welcome to '}</Text>
          <Text color={theme.welcomeBrand}>{'MiniChat'}</Text>
          <Text color={theme.welcomeText}>{'!'}</Text>
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={theme.welcomeText}>Welcome to MiniChat, your command-line chatbot powered by ChatGPT</Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text color={theme.welcomeText} dimColor>{subtitle}</Text>
      </Box>

      {showApiKeyInput ? (
        <Box flexDirection="column">
          <Text color={theme.welcomeText}>
            {`Paste or type your ${apiKeyMode === 'openrouterApiKey' ? 'OpenRouter' : 'OpenAI'} API key`}
          </Text>
          <Box marginTop={1}>
            <Text color={theme.welcomeIcon}>{'> '}</Text>
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              mask="*"
              onSubmit={(value) => {
                const nextApiKey = value.trim();
                if (!nextApiKey) return;
                onDone({
                  type: apiKeyMode,
                  apiKey: nextApiKey,
                });
              }}
            />
          </Box>
          <Box marginTop={1}>
            <Text color={theme.welcomeText} dimColor>Press Esc to go back</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          {OPTIONS.map((option, index) => {
            const isSelected = index === selectedIndex;

            return (
              <Box key={option.id} flexDirection="column" marginBottom={1}>
                <Text color={isSelected ? theme.welcomeBrand : theme.welcomeText}>
                  {`${isSelected ? '>' : ' '} ${index + 1}. ${option.title}`}
                </Text>
                <Text color={theme.welcomeText} dimColor>{`   ${option.description}`}</Text>
              </Box>
            );
          })}

          <Box marginTop={1}>
            <Text color={theme.welcomeText} dimColor>Press Enter to continue</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
