import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export const CommandPalette = ({ query, commands, selectedIndex }) => {
    const maxLen = commands.reduce((m, c) => Math.max(m, c.name.length), 0);
    return (_jsx(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: commands.length === 0 ? (_jsxs(Text, { color: "#555", children: ["No match for '", query, "'"] })) : (commands.map((cmd, idx) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: idx === selectedIndex ? '#B43A6C' : '#555', children: idx === selectedIndex ? '❯ ' : '  ' }), _jsx(Text, { color: idx === selectedIndex ? '#FFF' : '#888', bold: idx === selectedIndex, children: cmd.name.padEnd(maxLen) }), _jsxs(Text, { color: "#555", children: ['  ', cmd.description] })] }, cmd.name)))) }));
};
