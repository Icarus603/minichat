import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { listTranscripts } from '../core/transcriptManager.js';
export const ResumeModal = () => {
    const history = listTranscripts();
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "round", borderColor: "#666", padding: 1, margin: 2, children: [_jsx(Text, { bold: true, color: "#FFF", children: "Resume Conversation" }), _jsx(Text, { color: "#AAA", children: "(pick a transcript to restore)" }), history.length === 0 && _jsx(Text, { color: "#555", children: "No saved conversations." }), history.map((h) => (_jsxs(Text, { color: "#FFF", children: [h.name, "  ", _jsx(Text, { color: "#777", children: h.date })] }, h.id)))] }));
};
