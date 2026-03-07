import React from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../shared/theme.js';

export const WelcomePanel: React.FC = () => (
  <Box
    borderStyle="round"
    borderColor={theme.welcomeBorder}
    paddingLeft={1}
    marginBottom={1}
    width={29}
  >
    <Text>
      <Text color={theme.welcomeIcon}>{'✻  '}</Text>
      <Text color={theme.welcomeText}>{'Welcome to '}</Text>
      <Text color={theme.welcomeBrand}>{'MiniChat'}</Text>
      <Text color={theme.welcomeText}>{'!'}</Text>
    </Text>
  </Box>
);
