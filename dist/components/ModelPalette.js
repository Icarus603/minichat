import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, Text, useStdout } from 'ink';
import { getVisibleWindow } from './popupViewport.js';
export const ModelPalette = ({ stage, models, selectedIndex, currentModel, currentReasoningEffort, loading, error, query, effortOptions, }) => {
    const { stdout } = useStdout();
    const maxLen = models.reduce((m, model) => Math.max(m, model.id.length), 0);
    const maxVisibleItems = Math.max(4, Math.min(8, (stdout?.rows ?? 24) - 10));
    const visibleModelWindow = getVisibleWindow(models, selectedIndex, maxVisibleItems);
    const visibleEffortWindow = getVisibleWindow(effortOptions, selectedIndex, maxVisibleItems);
    return (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginTop: 0, children: [_jsx(Text, { color: "#888", children: stage === 'model' ? 'Select model' : 'Select reasoning effort' }), stage === 'model' && (_jsx(Text, { color: "#555", children: `Filter: ${query || '(type to search)'}` })), stage === 'model' && loading ? (_jsx(Text, { color: "#555", children: "Loading models\u2026" })) : stage === 'model' && error ? (_jsx(Text, { color: "#B43A6C", children: error })) : stage === 'model' && models.length === 0 ? (_jsx(Text, { color: "#555", children: "No models available for this login." })) : stage === 'effort' ? (_jsxs(_Fragment, { children: [visibleEffortWindow.startIndex > 0 && _jsx(Text, { color: "#555", children: "\u2026" }), visibleEffortWindow.visibleItems.map((effort, idx) => {
                        const absoluteIndex = visibleEffortWindow.startIndex + idx;
                        return (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: absoluteIndex === selectedIndex ? '#B43A6C' : '#555', children: absoluteIndex === selectedIndex ? '❯ ' : '  ' }), _jsx(Text, { color: absoluteIndex === selectedIndex ? '#FFF' : '#888', bold: absoluteIndex === selectedIndex, children: effort }), _jsx(Text, { color: effort === currentReasoningEffort ? '#B43A6C' : '#555', children: effort === currentReasoningEffort ? '  current' : '' })] }, effort));
                    }), visibleEffortWindow.startIndex + visibleEffortWindow.visibleItems.length < effortOptions.length && (_jsx(Text, { color: "#555", children: "\u2026" }))] })) : (_jsxs(_Fragment, { children: [visibleModelWindow.startIndex > 0 && _jsx(Text, { color: "#555", children: "\u2026" }), visibleModelWindow.visibleItems.map((model, idx) => {
                        const absoluteIndex = visibleModelWindow.startIndex + idx;
                        return (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: absoluteIndex === selectedIndex ? '#B43A6C' : '#555', children: absoluteIndex === selectedIndex ? '❯ ' : '  ' }), _jsx(Text, { color: absoluteIndex === selectedIndex ? '#FFF' : '#888', bold: absoluteIndex === selectedIndex, children: model.id.padEnd(maxLen) }), _jsx(Text, { color: model.id === currentModel ? '#B43A6C' : '#555', children: model.id === currentModel ? '  current' : '' })] }, model.id));
                    }), visibleModelWindow.startIndex + visibleModelWindow.visibleItems.length < models.length && (_jsx(Text, { color: "#555", children: "\u2026" }))] }))] }));
};
