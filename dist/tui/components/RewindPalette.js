import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useStdout } from 'ink';
import { getVisibleWindow } from './popupViewport.js';
export const RewindPalette = ({ entries, selectedIndex }) => {
    const { stdout } = useStdout();
    const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 8));
    const { visibleItems, startIndex } = getVisibleWindow(entries, selectedIndex, maxVisibleItems);
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: [_jsx(Text, { color: "#888", children: "Rewind history" }), _jsx(Text, { color: "#555", children: "Enter rewind, \u2191 \u2193 move, Esc close." }), startIndex > 0 && _jsx(Text, { color: "#555", children: "\u2026" }), visibleItems.map((entry, idx) => {
                const absoluteIndex = startIndex + idx;
                const isSelected = absoluteIndex === selectedIndex;
                const preview = entry.preview.length > 96 ? `${entry.preview.slice(0, 93)}...` : entry.preview;
                return (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: isSelected ? '#B43A6C' : '#555', children: isSelected ? '❯ ' : '  ' }), _jsx(Text, { color: isSelected ? '#FFF' : '#888', bold: isSelected, children: preview })] }, `${entry.transcriptIndex}-${preview}`));
            }), startIndex + visibleItems.length < entries.length && _jsx(Text, { color: "#555", children: "\u2026" })] }));
};
