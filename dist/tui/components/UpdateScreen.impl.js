import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { theme } from '../../shared/theme.js';
export const UpdateScreen = ({ update, onDone, onInstall }) => {
    const [installing, setInstalling] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    useInput((input, key) => {
        if (installing) {
            return;
        }
        if (key.escape || input.toLowerCase() === 's') {
            onDone('skip');
            return;
        }
        if (key.return) {
            setInstalling(true);
            setStatus(`Updating MiniChat to ${update.latestVersion}...`);
            void onInstall().then((result) => {
                if (result.ok) {
                    setStatus(`MiniChat ${update.latestVersion} installed. Restart MiniChat to use the new version.`);
                    setInstalling(false);
                    onDone('updated');
                    return;
                }
                setError(result.output || 'Update failed.');
                setInstalling(false);
            });
        }
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(WelcomePanel, {}), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsx(Text, { color: theme.welcomeText, children: "A new version of MiniChat is available." }), _jsx(Text, { color: theme.welcomeBrand, children: `v${update.currentVersion} -> v${update.latestVersion}` }), _jsx(Text, { color: "#888", children: update.releaseUrl }), _jsx(Text, { children: ' ' }), status ? (_jsx(Text, { color: "#B43A6C", children: status })) : (_jsx(Text, { color: theme.welcomeText, children: "Press Enter to update now, or Esc to skip for now." })), error && (_jsxs(_Fragment, { children: [_jsx(Text, { children: ' ' }), _jsx(Text, { color: "#B43A6C", children: "Update failed." }), _jsx(Text, { color: "#888", children: error }), _jsx(Text, { color: "#888", children: "You can also run brew upgrade --cask Icarus603/tap/minichat manually." })] }))] })] }));
};
