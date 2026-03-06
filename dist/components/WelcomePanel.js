import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text } from 'ink';
import { theme } from '../core/theme.js';
export const WelcomePanel = () => (_jsx(Box, { borderStyle: "round", borderColor: theme.welcomeBorder, paddingLeft: 1, marginBottom: 1, width: 29, children: _jsxs(Text, { children: [_jsx(Text, { color: theme.welcomeIcon, children: '✻  ' }), _jsx(Text, { color: theme.welcomeText, children: 'Welcome to ' }), _jsx(Text, { color: theme.welcomeBrand, children: 'MiniChat' }), _jsx(Text, { color: theme.welcomeText, children: '!' })] }) }));
