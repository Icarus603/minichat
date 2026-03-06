import React from 'react';
import { Box, Text } from 'ink';
import { listTranscripts } from '../core/transcriptManager.js';

export const ResumeModal: React.FC = () => {
  const history = listTranscripts();
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#666" padding={1} margin={2}>
      <Text bold color="#FFF">Resume Conversation</Text>
      <Text color="#AAA">(pick a transcript to restore)</Text>
      {history.length === 0 && <Text color="#555">No saved conversations.</Text>}
      {history.map((h: { id: string; name: string; date: string }) => (
        <Text key={h.id} color="#FFF">{h.name}  <Text color="#777">{h.date}</Text></Text>
      ))}
    </Box>
  );
};
