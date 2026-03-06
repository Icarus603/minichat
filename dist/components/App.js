import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, useApp } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { ChatPanel } from './ChatPanel.js';
import { InputBox } from './InputBox.js';
import { ResumeModal } from './ResumeModal.js';
import { getConfig } from '../core/configManager.js';
import { chat } from '../core/openaiClient.js';
import { saveTranscript } from '../core/transcriptManager.js';
const SESSION_ID = new Date().toISOString().replace(/[:.]/g, '-');
export const App = ({ resumeMode }) => {
    const { exit } = useApp();
    const [transcript, setTranscript] = useState([]);
    const [loading, setLoading] = useState(false);
    const handleSend = async (input) => {
        const userMsg = { role: 'user', content: input };
        const updated = [...transcript, userMsg];
        setTranscript(updated);
        setLoading(true);
        try {
            const config = getConfig();
            const response = await chat(updated, config);
            const aiMsg = { role: 'ai', content: response };
            const final = [...updated, aiMsg];
            setTranscript(final);
            saveTranscript(SESSION_ID, final);
        }
        catch (err) {
            const errMsg = {
                role: 'ai',
                content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            };
            setTranscript([...updated, errMsg]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCommand = (cmd) => {
        if (cmd === '/clear') {
            setTranscript([]);
        }
        else if (cmd === '/quit' || cmd === '/exit') {
            exit();
        }
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(WelcomePanel, {}), resumeMode ? (_jsx(ResumeModal, {})) : (_jsxs(_Fragment, { children: [_jsx(ChatPanel, { transcript: transcript, loading: loading }), _jsx(InputBox, { onSend: handleSend, onCommand: handleCommand })] }))] }));
};
