import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { theme } from '../core/theme.js';
import type { UpdateInfo, UpdateInstallResult } from '../core/updater.js';

type Props = {
  update: UpdateInfo;
  onDone: (action: 'skip' | 'updated') => void;
  onInstall: () => Promise<UpdateInstallResult>;
};

export const UpdateScreen: React.FC<Props> = ({ update, onDone, onInstall }) => {
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (installing) {
      return;
    }

    if (key.escape || input.toLowerCase() === 's') {
      onDone('skip');
      return;
    }

    if (key.return) {
      setInstalling(true);
      setStatus(`Updating MiniChat to ${update.latestVersion}...`);
      void onInstall().then((result) => {
        if (result.ok) {
          setStatus(`MiniChat ${update.latestVersion} installed. Restart MiniChat to use the new version.`);
          setInstalling(false);
          onDone('updated');
          return;
        }

        setError(result.output || 'Update failed.');
        setInstalling(false);
      });
    }
  });

  return (
    <Box flexDirection="column">
      <WelcomePanel />
      <Box flexDirection="column" paddingLeft={1}>
        <Text color={theme.welcomeText}>A new version of MiniChat is available.</Text>
        <Text color={theme.welcomeBrand}>{`v${update.currentVersion} -> v${update.latestVersion}`}</Text>
        <Text color="#888">{update.releaseUrl}</Text>
        <Text>{' '}</Text>
        {status ? (
          <Text color="#B43A6C">{status}</Text>
        ) : (
          <Text color={theme.welcomeText}>Press Enter to update now, or Esc to skip for now.</Text>
        )}
        {error && (
          <>
            <Text>{' '}</Text>
            <Text color="#B43A6C">Update failed.</Text>
            <Text color="#888">{error}</Text>
            <Text color="#888">You can also run brew upgrade --cask Icarus603/tap/minichat manually.</Text>
          </>
        )}
      </Box>
    </Box>
  );
};
