import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../core/theme.js';

export const DeviceCodeScreen: React.FC<{
  verificationUri: string;
  userCode: string;
}> = ({ verificationUri, userCode }) => (
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
      <Text color={theme.welcomeText}>Finish signing in via your browser</Text>
    </Box>

    <Box flexDirection="column" marginBottom={2}>
      <Text color={theme.welcomeText} dimColor>
        Open the link below, sign in, then enter the one-time code shown here.
      </Text>
    </Box>

    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.welcomeBrand}>{verificationUri}</Text>
    </Box>

    <Box flexDirection="column" marginBottom={1}>
      <Text color={theme.welcomeText}>Your one-time code</Text>
    </Box>

    <Box marginBottom={2}>
      <Text color={theme.welcomeBrand}>{userCode}</Text>
    </Box>

    <Box flexDirection="column">
      <Text color={theme.welcomeText} dimColor>
        Device codes are a common phishing target. Never share this code.
      </Text>
    </Box>
  </Box>
);
