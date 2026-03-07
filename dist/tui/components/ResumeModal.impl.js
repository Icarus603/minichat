import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { listTranscripts } from '../../services/storage/transcriptStore.js';
import { getVisibleWindow } from './popupViewport.js';
export const ResumeModal = ({ onSelect }) => {
    const { stdout } = useStdout();
    const history = listTranscripts();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const maxVisibleItems = Math.max(2, Math.min(4, Math.floor(((stdout?.rows ?? 24) - 10) / 3)));
    const { visibleItems, startIndex } = getVisibleWindow(history, selectedIndex, maxVisibleItems);
    useInput((input, key) => {
        if (key.escape) {
            onSelect(null);
            return;
        }
        if (history.length === 0) {
            if (key.return) {
                onSelect(null);
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex((index) => Math.max(0, index - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex((index) => Math.min(history.length - 1, index + 1));
            return;
        }
        if (key.return) {
            onSelect(history[selectedIndex]?.id ?? null);
            return;
        }
        if (/^[1-9]$/.test(input)) {
            const index = Number(input) - 1;
            if (index < history.length) {
                setSelectedIndex(index);
            }
        }
    });
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "#666", padding: 1, margin: 2, children: [_jsx(Text, { bold: true, color: "#FFF", children: "Resume Conversation" }), _jsx(Text, { color: "#AAA", children: "Select a transcript to restore, or press Esc to cancel." }), history.length === 0 && (_jsx(Text, { color: "#555", children: "No saved conversations. Press Enter or Esc to continue." })), startIndex > 0 && _jsx(Text, { color: "#555", children: "\u2026" }), visibleItems.map((item, index) => {
                const absoluteIndex = startIndex + index;
                const selected = absoluteIndex === selectedIndex;
                return (_jsxs(Box, { flexDirection: "column", marginTop: 1, children: [_jsxs(Text, { color: selected ? '#B43A6C' : '#FFF', children: [`${selected ? '>' : ' '} ${absoluteIndex + 1}. ${item.name}`, _jsx(Text, { color: "#777", children: `  ${item.date}` })] }), _jsx(Text, { color: "#777", children: `   ${item.preview}` }), _jsx(Text, { color: "#555", children: `   ${item.messageCount} messages` })] }, item.id));
            }), startIndex + visibleItems.length < history.length && _jsx(Text, { color: "#555", children: "\u2026" })] }));
};
