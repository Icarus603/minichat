import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
export const ModelPalette = ({ models, selectedIndex, currentModel, loading, error }) => {
    const maxLen = models.reduce((m, model) => Math.max(m, model.id.length), 0);
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: [_jsx(Text, { color: "#888", children: "Select model" }), loading ? (_jsx(Text, { color: "#555", children: "Loading models\u2026" })) : error ? (_jsx(Text, { color: "#B43A6C", children: error })) : models.length === 0 ? (_jsx(Text, { color: "#555", children: "No models available for this login." })) : (models.map((model, idx) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: idx === selectedIndex ? '#B43A6C' : '#555', children: idx === selectedIndex ? '❯ ' : '  ' }), _jsx(Text, { color: idx === selectedIndex ? '#FFF' : '#888', bold: idx === selectedIndex, children: model.id.padEnd(maxLen) }), _jsx(Text, { color: model.id === currentModel ? '#B43A6C' : '#555', children: model.id === currentModel ? '  current' : '' })] }, model.id))))] }));
};
