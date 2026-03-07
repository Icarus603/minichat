import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { theme } from '../../shared/theme.js';
import { renderMarkdown } from '../../shared/markdown.js';
const StatusDot = ({ blinking = false }) => {
    const [visible, setVisible] = useState(true);
    useEffect(() => {
        if (!blinking) {
            setVisible(true);
            return;
        }
        const t = setInterval(() => setVisible((v) => !v), 600);
        return () => clearInterval(t);
    }, [blinking]);
    return _jsx(Text, { color: "#B43A6C", children: visible ? '⏺ ' : '  ' });
};
const TranscriptMessage = memo(({ msg, isLastMessage, hasLoadingMessage, }) => {
    const marginBottom = !isLastMessage || hasLoadingMessage ? 1 : 0;
    return (_jsx(Box, { flexDirection: "column", marginBottom: marginBottom, children: msg.role === 'user' ? (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: theme.chatUser, children: '❯ ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { color: theme.chatUser, children: msg.content }) })] })) : msg.role === 'status' ? (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: "#B43A6C", children: '⏺ ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { color: "#B43A6C", dimColor: true, children: msg.content }) })] })) : (renderMarkdown(msg.content)
            .split('\n')
            .map((line, lineIdx) => (_jsxs(Box, { flexDirection: "row", children: [lineIdx === 0
                    ? _jsx(Text, { color: "#B43A6C", children: '⏺ ' })
                    : _jsx(Text, { children: '  ' }), _jsx(Box, { flexGrow: 1, children: _jsx(Text, { children: line }) })] }, lineIdx)))) }));
});
export const ChatPanel = ({ transcript, loadingMessage, loadingBlinking = true }) => {
    const items = useMemo(() => transcript.map((msg, idx) => ({
        id: `${idx}-${msg.role}`,
        msg,
        isLastMessage: idx === transcript.length - 1,
    })), [transcript]);
    return (_jsxs(Box, { flexDirection: "column", flexGrow: 1, marginBottom: 1, paddingX: 1, children: [items.map((item) => (_jsx(TranscriptMessage, { msg: item.msg, isLastMessage: item.isLastMessage, hasLoadingMessage: Boolean(loadingMessage) }, item.id))), loadingMessage && (_jsxs(Box, { flexDirection: "row", children: [_jsx(StatusDot, { blinking: loadingBlinking }), loadingMessage === 'thinking…' ? (_jsx(Text, { color: "#888", children: loadingMessage })) : (_jsx(Text, { color: "#B43A6C", dimColor: true, children: loadingMessage }))] }))] }));
};
