import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { theme } from '../core/theme.js';
const OPTIONS = [
    {
        id: 'chatgpt',
        title: 'Sign in with ChatGPT',
        description: 'Usage included with Plus, Pro, Business, and Enterprise plans',
    },
    {
        id: 'device',
        title: 'Sign in with Device Code',
        description: 'Sign in from another device with a one-time code',
    },
    {
        id: 'openaiApiKey',
        title: 'Use OpenAI API key',
        description: 'Use OpenAI-hosted API models with your own key',
    },
    {
        id: 'openrouterApiKey',
        title: 'Use OpenRouter API key',
        description: 'Use OpenRouter with OpenAI and other routed models',
    },
];
export const SetupScreen = ({ onDone }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [apiKeyMode, setApiKeyMode] = useState('openaiApiKey');
    const selectedOption = OPTIONS[selectedIndex];
    const subtitle = useMemo(() => {
        if (showApiKeyInput) {
            return `Paste or type your ${apiKeyMode === 'openrouterApiKey' ? 'OpenRouter' : 'OpenAI'} API key below. It will be stored locally in ~/.minichat/config.json.`;
        }
        return 'Sign in with ChatGPT to use MiniChat with your OpenAI account, or connect an OpenAI / OpenRouter API key for usage-based billing.';
    }, [apiKeyMode, showApiKeyInput]);
    useInput((input, key) => {
        if (showApiKeyInput) {
            if (key.escape) {
                setShowApiKeyInput(false);
                setApiKey('');
            }
            return;
        }
        if (key.upArrow) {
            setSelectedIndex((index) => Math.max(0, index - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex((index) => Math.min(OPTIONS.length - 1, index + 1));
            return;
        }
        if (input === '1' || input === '2' || input === '3' || input === '4') {
            setSelectedIndex(Number(input) - 1);
            return;
        }
        if (key.return) {
            if (selectedOption.id === 'openaiApiKey' || selectedOption.id === 'openrouterApiKey') {
                setApiKeyMode(selectedOption.id);
                setShowApiKeyInput(true);
                return;
            }
            onDone({ type: selectedOption.id });
        }
    });
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, children: [_jsx(Box, { borderStyle: "round", borderColor: theme.welcomeBorder, paddingLeft: 1, marginBottom: 2, width: 29, children: _jsxs(Text, { children: [_jsx(Text, { color: theme.welcomeIcon, children: '✻  ' }), _jsx(Text, { color: theme.welcomeText, children: 'Welcome to ' }), _jsx(Text, { color: theme.welcomeBrand, children: 'MiniChat' }), _jsx(Text, { color: theme.welcomeText, children: '!' })] }) }), _jsx(Box, { flexDirection: "column", marginBottom: 1, children: _jsx(Text, { color: theme.welcomeText, children: "Welcome to MiniChat, your command-line chatbot powered by ChatGPT" }) }), _jsx(Box, { flexDirection: "column", marginBottom: 2, children: _jsx(Text, { color: theme.welcomeText, dimColor: true, children: subtitle }) }), showApiKeyInput ? (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { color: theme.welcomeText, children: `Paste or type your ${apiKeyMode === 'openrouterApiKey' ? 'OpenRouter' : 'OpenAI'} API key` }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: theme.welcomeIcon, children: '> ' }), _jsx(TextInput, { value: apiKey, onChange: setApiKey, mask: "*", onSubmit: (value) => {
                                    const nextApiKey = value.trim();
                                    if (!nextApiKey)
                                        return;
                                    onDone({
                                        type: apiKeyMode,
                                        apiKey: nextApiKey,
                                    });
                                } })] }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: theme.welcomeText, dimColor: true, children: "Press Esc to go back" }) })] })) : (_jsxs(Box, { flexDirection: "column", children: [OPTIONS.map((option, index) => {
                        const isSelected = index === selectedIndex;
                        return (_jsxs(Box, { flexDirection: "column", marginBottom: 1, children: [_jsx(Text, { color: isSelected ? theme.welcomeBrand : theme.welcomeText, children: `${isSelected ? '>' : ' '} ${index + 1}. ${option.title}` }), _jsx(Text, { color: theme.welcomeText, dimColor: true, children: `   ${option.description}` })] }, option.id));
                    }), _jsx(Box, { marginTop: 1, children: _jsx(Text, { color: theme.welcomeText, dimColor: true, children: "Press Enter to continue" }) })] }))] }));
};
