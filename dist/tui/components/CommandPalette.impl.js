import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text, useStdout } from 'ink';
import { getVisibleWindow } from './popupViewport.js';
export const CommandPalette = ({ query, commands, selectedIndex }) => {
    const { stdout } = useStdout();
    const maxLen = commands.reduce((m, c) => Math.max(m, c.name.length), 0);
    const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 8));
    const { visibleItems, startIndex } = getVisibleWindow(commands, selectedIndex, maxVisibleItems);
    const hasHiddenAbove = startIndex > 0;
    const hasHiddenBelow = startIndex + visibleItems.length < commands.length;
    return (_jsx(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: commands.length === 0 ? (_jsxs(Text, { color: "#555", children: ["No match for '", query, "'"] })) : (_jsxs(_Fragment, { children: [hasHiddenAbove && _jsx(Text, { color: "#555", children: "\u2026" }), visibleItems.map((cmd, idx) => {
                    const absoluteIndex = startIndex + idx;
                    return (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: absoluteIndex === selectedIndex ? '#B43A6C' : '#555', children: absoluteIndex === selectedIndex ? '❯ ' : '  ' }), _jsx(Text, { color: absoluteIndex === selectedIndex ? '#FFF' : '#888', bold: absoluteIndex === selectedIndex, children: cmd.name.padEnd(maxLen) }), _jsxs(Text, { color: "#555", children: ['  ', cmd.description] })] }, cmd.name));
                }), hasHiddenBelow && _jsx(Text, { color: "#555", children: "\u2026" })] })) }));
};
