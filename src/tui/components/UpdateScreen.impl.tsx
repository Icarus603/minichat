import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { theme } from '../../shared/theme.js';
import type {
  UpdateInfo,
  UpdateInstallProgress,
  UpdateInstallResult,
} from '../../services/updater/updateService.js';

type Props = {
  update: UpdateInfo;
  onDone: (action: 'skip' | 'updated') => void;
  onInstall: (onProgress?: (progress: UpdateInstallProgress) => void) => Promise<UpdateInstallResult>;
};

export const UpdateScreen: React.FC<Props> = ({ update, onDone, onInstall }) => {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState<string | null>(null);
  const [logOutput, setLogOutput] = useState('');

  const appendLog = (chunk: string) => {
    setLogOutput((current) => {
      const next = `${current}${chunk}`.trim();
      const lines = next.split('\n');
      return lines.slice(-12).join('\n');
    });
  };

  useInput((input, key) => {
    if (installing) {
      return;
    }

    if (installed) {
      if (key.return || key.escape) {
        onDone('updated');
      }
      return;
    }

    if (key.escape || input.toLowerCase() === 's') {
      onDone('skip');
      return;
    }

    if (key.return) {
      setInstalling(true);
      setInstalled(false);
      setStatus(`Updating MiniChat to ${update.latestVersion}...`);
      setError(null);
      setCommand(null);
      setLogOutput('');
      void onInstall((progress) => {
        setCommand(progress.command);
        if (progress.chunk) {
          appendLog(progress.chunk);
        }
      }).then((result) => {
        if (result.ok) {
          setStatus(`MiniChat ${update.latestVersion} installed. Restart MiniChat to use the new version.`);
          if (result.output) {
            setLogOutput(result.output);
          }
          setInstalling(false);
          setInstalled(true);
          return;
        }

        setError(result.output || 'Update failed.');
        if (result.output) {
          setLogOutput(result.output);
        }
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
          <Box flexDirection="column">
            <Text color="#B43A6C">{status}</Text>
            {command && (
              <Text color="#888">{`$ ${command}`}</Text>
            )}
            {logOutput && (
              <Box marginTop={1} flexDirection="column">
                {logOutput.split('\n').map((line, index) => (
                  <Text key={`${index}-${line}`} color="#888">
                    {line}
                  </Text>
                ))}
              </Box>
            )}
          </Box>
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
        {installed && (
          <>
            <Text>{' '}</Text>
            <Text color={theme.welcomeText}>Press Enter to continue.</Text>
          </>
        )}
      </Box>
    </Box>
  );
};
