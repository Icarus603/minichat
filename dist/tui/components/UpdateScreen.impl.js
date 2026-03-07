import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { theme } from '../../shared/theme.js';
export const UpdateScreen = ({ update, onDone, onInstall }) => {
    const [installing, setInstalling] = useState(false);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [command, setCommand] = useState(null);
    const [logOutput, setLogOutput] = useState('');
    const appendLog = (chunk) => {
        setLogOutput((current) => {
            const next = `${current}${chunk}`.trim();
            const lines = next.split('\n');
            return lines.slice(-12).join('\n');
        });
    };
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
            setError(null);
            setCommand(null);
            setLogOutput('');
            void onInstall((progress) => {
                setCommand(progress.command);
                if (progress.chunk) {
                    appendLog(progress.chunk);
                }
            }).then((result) => {
                if (result.ok) {
                    setStatus(`MiniChat ${update.latestVersion} installed. Restart MiniChat to use the new version.`);
                    if (result.output) {
                        setLogOutput(result.output);
                    }
                    setInstalling(false);
                    onDone('updated');
                    return;
                }
                setError(result.output || 'Update failed.');
                if (result.output) {
                    setLogOutput(result.output);
                }
                setInstalling(false);
            });
        }
    });
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(WelcomePanel, {}), _jsxs(Box, { flexDirection: "column", paddingLeft: 1, children: [_jsx(Text, { color: theme.welcomeText, children: "A new version of MiniChat is available." }), _jsx(Text, { color: theme.welcomeBrand, children: `v${update.currentVersion} -> v${update.latestVersion}` }), _jsx(Text, { color: "#888", children: update.releaseUrl }), _jsx(Text, { children: ' ' }), status ? (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: "#B43A6C", children: status }), command && (_jsx(Text, { color: "#888", children: `$ ${command}` })), logOutput && (_jsx(Box, { marginTop: 1, flexDirection: "column", children: logOutput.split('\n').map((line, index) => (_jsx(Text, { color: "#888", children: line }, `${index}-${line}`))) }))] })) : (_jsx(Text, { color: theme.welcomeText, children: "Press Enter to update now, or Esc to skip for now." })), error && (_jsxs(_Fragment, { children: [_jsx(Text, { children: ' ' }), _jsx(Text, { color: "#B43A6C", children: "Update failed." }), _jsx(Text, { color: "#888", children: error }), _jsx(Text, { color: "#888", children: "You can also run brew upgrade --cask Icarus603/tap/minichat manually." })] }))] })] }));
};
