import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../core/theme.js';
import { renderMarkdown } from '../core/markdown.js';
const BlinkingDot = () => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        const t = setInterval(() => setVisible((v) => !v), 600);
        return () => clearInterval(t);
    }, []);
    return _jsx(Text, { color: "#B43A6C", children: visible ? '⏺ ' : '  ' });
};
export const ChatPanel = ({ transcript, loading }) => (_jsxs(Box, { flexDirection: "column", flexGrow: 1, marginBottom: 1, paddingX: 1, children: [transcript.map((msg, idx) => {
            const isLastMessage = idx === transcript.length - 1;
            const marginBottom = !isLastMessage || loading ? 1 : 0;
            return (_jsx(Box, { flexDirection: "column", marginBottom: marginBottom, children: msg.role === 'user' ? (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: theme.chatUser, children: '❯ ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { color: theme.chatUser, children: msg.content }) })] })) : (renderMarkdown(msg.content)
                    .split('\n')
                    .map((line, lineIdx) => (_jsxs(Box, { flexDirection: "row", children: [lineIdx === 0
                            ? _jsx(Text, { color: "#B43A6C", children: '⏺ ' })
                            : _jsx(Text, { children: '  ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { children: line }) })] }, lineIdx)))) }, idx));
        }), loading && (_jsxs(Box, { flexDirection: "row", children: [_jsx(BlinkingDot, {}), _jsx(Text, { color: "#888", children: "thinking\u2026" })] }))] }));
