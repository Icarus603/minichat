import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { listTranscripts, sanitizeTranscriptName } from '../core/transcriptManager.js';
export const SessionsModal = ({ currentSessionId, onResume, onRename, onDelete, onClose }) => {
    const [history, setHistory] = useState(() => listTranscripts());
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [renameMode, setRenameMode] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [error, setError] = useState(null);
    useEffect(() => {
        setHistory(listTranscripts());
    }, []);
    const selected = history[selectedIndex] ?? null;
    const refreshHistory = () => {
        const next = listTranscripts();
        setHistory(next);
        setSelectedIndex(index => Math.max(0, Math.min(next.length - 1, index)));
        return next;
    };
    useInput((input, key) => {
        if (renameMode) {
            if (key.escape) {
                setRenameMode(false);
                setRenameValue('');
                setError(null);
            }
            return;
        }
        if (key.escape) {
            onClose();
            return;
        }
        if (history.length === 0) {
            if (key.return) {
                onClose();
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(index => Math.max(0, index - 1));
            setError(null);
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(index => Math.min(history.length - 1, index + 1));
            setError(null);
            return;
        }
        if (key.return && selected) {
            onResume(selected.id);
            return;
        }
        if ((input === 'r' || input === 'R') && selected) {
            setRenameMode(true);
            setRenameValue(selected.name);
            setError(null);
            return;
        }
        if ((input === 'd' || input === 'D') && selected) {
            onDelete(selected.id);
            const next = refreshHistory();
            if (next.length === 0) {
                onClose();
            }
            return;
        }
    });
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: [_jsx(Text, { color: "#888", children: "Sessions" }), _jsx(Text, { color: "#555", children: "Enter resume, R rename, D delete, Esc close." }), history.length === 0 && _jsx(Text, { color: "#555", children: "No saved conversations." }), history.map((item, index) => {
                const isSelected = index === selectedIndex;
                const isCurrent = item.id === currentSessionId;
                return (_jsxs(Box, { flexDirection: "column", children: [_jsxs(Text, { color: isSelected ? '#B43A6C' : '#FFF', children: [`${isSelected ? '❯' : ' '} ${item.name}`, _jsx(Text, { color: isCurrent ? '#B43A6C' : '#777', children: isCurrent ? '  current' : `  ${item.date}` })] }), _jsx(Text, { color: "#777", children: `   ${item.preview}` }), _jsx(Text, { color: "#555", children: `   ${item.messageCount} messages` })] }, item.id));
            }), renameMode && selected && (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "#888", children: "Rename session" }), _jsxs(Box, { children: [_jsx(Text, { color: "#B43A6C", children: '> ' }), _jsx(TextInput, { value: renameValue, onChange: setRenameValue, onSubmit: (value) => {
                                    const nextName = sanitizeTranscriptName(value);
                                    if (!nextName) {
                                        setError('Session name cannot be empty.');
                                        return;
                                    }
                                    const renamed = onRename(selected.id, nextName);
                                    if (!renamed) {
                                        setError('Could not rename session.');
                                        return;
                                    }
                                    setRenameMode(false);
                                    setRenameValue('');
                                    setError(null);
                                    const next = refreshHistory();
                                    const renamedIndex = next.findIndex(item => item.id === nextName);
                                    if (renamedIndex >= 0) {
                                        setSelectedIndex(renamedIndex);
                                    }
                                } })] }), _jsx(Text, { color: "#555", children: "Press Esc to cancel rename." })] })), error && _jsx(Text, { color: "#B43A6C", children: error })] }));
};
