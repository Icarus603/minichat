import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { Box, useApp } from 'ink';
import { WelcomePanel } from './WelcomePanel.js';
import { ChatPanel } from './ChatPanel.js';
import { InputBox } from './InputBox.js';
import { getConfig } from '../core/configManager.js';
import { saveConfig } from '../core/configManager.js';
import { chat } from '../core/openaiClient.js';
import { analyzeContextEvolution, applyContextEvolution } from '../core/contextEvolution.js';
import { deleteTranscript, loadTranscript, renameTranscript, saveTranscript } from '../core/transcriptManager.js';
import { getReasoningEffortOptions, listAvailableModels, supportsReasoningEffort, } from '../core/modelCatalog.js';
import { SessionsModal } from './SessionsModal.js';
const createSessionId = () => new Date().toISOString().replace(/[:.]/g, '-');
export const App = ({ sessionId, initialTranscript = [], onAuthAction }) => {
    const { exit } = useApp();
    const activeRequestRef = useRef(null);
    const [currentSessionId, setCurrentSessionId] = useState(sessionId);
    const [transcript, setTranscript] = useState(initialTranscript);
    const [loading, setLoading] = useState(false);
    const [modelPickerOpen, setModelPickerOpen] = useState(false);
    const [modelPickerStage, setModelPickerStage] = useState('model');
    const [modelPickerLoading, setModelPickerLoading] = useState(false);
    const [modelPickerError, setModelPickerError] = useState(null);
    const [modelOptions, setModelOptions] = useState([]);
    const [modelSelectedIndex, setModelSelectedIndex] = useState(0);
    const [modelQuery, setModelQuery] = useState('');
    const [modelEffortOptions, setModelEffortOptions] = useState([]);
    const [pendingModel, setPendingModel] = useState(null);
    const [sessionsOpen, setSessionsOpen] = useState(false);
    const [loadingState, setLoadingState] = useState(null);
    const isInterruptedError = (error) => {
        if (!(error instanceof Error)) {
            return false;
        }
        return error.name === 'AbortError' ||
            error.message === 'Request interrupted' ||
            error.message.toLowerCase().includes('aborted');
    };
    const filteredModelOptions = modelOptions.filter(model => model.id.toLowerCase().includes(modelQuery.trim().toLowerCase()));
    const handleSend = async (input) => {
        if (loading) {
            return;
        }
        const userMsg = { role: 'user', content: input };
        const updated = [...transcript, userMsg];
        const requestController = new AbortController();
        activeRequestRef.current = requestController;
        setTranscript(updated);
        saveTranscript(currentSessionId, updated);
        setLoading(true);
        setLoadingState({ message: 'thinking…', blinking: true });
        try {
            const config = getConfig();
            const planned = await analyzeContextEvolution(updated, config, requestController.signal);
            const statusMessages = [];
            if (planned.soul.length > 0) {
                const applied = applyContextEvolution(planned);
                if (applied.soul.length > 0) {
                    statusMessages.push({ role: 'status', content: 'SOUL updated' });
                }
            }
            const response = await chat(updated, config, requestController.signal);
            const aiMsg = { role: 'ai', content: response };
            const final = [...updated, ...statusMessages, aiMsg];
            setTranscript(final);
            saveTranscript(currentSessionId, final);
        }
        catch (err) {
            if (isInterruptedError(err)) {
                const interrupted = [...updated, { role: 'status', content: 'Generation stopped' }];
                setTranscript(interrupted);
                saveTranscript(currentSessionId, interrupted);
                return;
            }
            const errMsg = {
                role: 'ai',
                content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            };
            const final = [...updated, errMsg];
            setTranscript(final);
            saveTranscript(currentSessionId, final);
        }
        finally {
            if (activeRequestRef.current === requestController) {
                activeRequestRef.current = null;
            }
            setLoading(false);
            setLoadingState(null);
        }
    };
    const handleInterrupt = () => {
        activeRequestRef.current?.abort();
    };
    const openModelPicker = async () => {
        const config = getConfig();
        if (!config) {
            return;
        }
        setModelPickerOpen(true);
        setModelPickerStage('model');
        setModelPickerLoading(true);
        setModelPickerError(null);
        setModelQuery('');
        setModelEffortOptions([]);
        setPendingModel(null);
        try {
            const models = await listAvailableModels(config);
            setModelOptions(models);
            const currentIndex = models.findIndex(model => model.id === config.model);
            setModelSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        catch (error) {
            setModelOptions([]);
            setModelSelectedIndex(0);
            setModelPickerError(error instanceof Error ? error.message : String(error));
        }
        finally {
            setModelPickerLoading(false);
        }
    };
    const handleCommand = (cmd) => {
        if (cmd === '/model') {
            void openModelPicker();
            return;
        }
        if (cmd === '/new') {
            const nextSessionId = createSessionId();
            setCurrentSessionId(nextSessionId);
            setTranscript([]);
            saveTranscript(nextSessionId, []);
            return;
        }
        if (cmd === '/sessions') {
            setSessionsOpen(true);
            return;
        }
        if (cmd === '/login' || cmd === '/logout') {
            onAuthAction(cmd === '/login' ? 'login' : 'logout');
            return;
        }
        if (cmd === '/clear') {
            setTranscript([]);
            saveTranscript(currentSessionId, []);
        }
        else if (cmd === '/quit' || cmd === '/exit') {
            exit();
        }
    };
    const handleModelMove = (direction) => {
        setModelSelectedIndex(index => {
            const length = modelPickerStage === 'effort' ? modelEffortOptions.length : filteredModelOptions.length;
            if (length === 0) {
                return 0;
            }
            return Math.max(0, Math.min(length - 1, index + direction));
        });
    };
    const handleModelClose = () => {
        if (modelPickerStage === 'effort') {
            const config = getConfig();
            const currentIndex = config
                ? filteredModelOptions.findIndex(model => model.id === (pendingModel ?? config.model))
                : -1;
            setModelPickerStage('model');
            setModelSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
            return;
        }
        closeModelPicker();
    };
    const closeModelPicker = () => {
        setModelPickerOpen(false);
        setModelPickerStage('model');
        setModelPickerLoading(false);
        setModelPickerError(null);
        setModelOptions([]);
        setModelSelectedIndex(0);
        setModelQuery('');
        setModelEffortOptions([]);
        setPendingModel(null);
    };
    const handleModelSelect = () => {
        const config = getConfig();
        const selectedModelId = modelPickerStage === 'model'
            ? filteredModelOptions[modelSelectedIndex]?.id
            : pendingModel;
        if (!config || !selectedModelId) {
            handleModelClose();
            return;
        }
        if (modelPickerStage === 'model') {
            if (supportsReasoningEffort(config, selectedModelId)) {
                const effortOptions = getReasoningEffortOptions(config, selectedModelId);
                setPendingModel(selectedModelId);
                setModelEffortOptions(effortOptions);
                setModelPickerStage('effort');
                const currentEffort = config.reasoningEffort;
                const currentEffortIndex = currentEffort ? effortOptions.findIndex(option => option === currentEffort) : -1;
                setModelSelectedIndex(currentEffortIndex >= 0 ? currentEffortIndex : 0);
                return;
            }
            saveConfig({
                ...config,
                model: selectedModelId,
                reasoningEffort: undefined,
            });
            setTranscript(current => [
                ...current,
                { role: 'ai', content: `Switched model to ${selectedModelId}.` },
            ]);
            closeModelPicker();
            return;
        }
        const selectedEffort = modelEffortOptions[modelSelectedIndex];
        saveConfig({
            ...config,
            model: selectedModelId,
            reasoningEffort: selectedEffort,
        });
        setTranscript(current => [
            ...current,
            {
                role: 'ai',
                content: selectedEffort
                    ? `Switched model to ${selectedModelId} (${selectedEffort} effort).`
                    : `Switched model to ${selectedModelId}.`,
            },
        ]);
        closeModelPicker();
    };
    const handleModelQueryChange = (query) => {
        setModelQuery(query);
        setModelSelectedIndex(0);
    };
    return (_jsxs(Box, { flexDirection: "column", children: [_jsx(WelcomePanel, {}), _jsx(ChatPanel, { transcript: transcript, loadingMessage: loading ? loadingState?.message ?? 'thinking…' : null, loadingBlinking: loading ? loadingState?.blinking ?? true : false }), _jsx(InputBox, { onSend: handleSend, loading: loading, onInterrupt: handleInterrupt, onCommand: handleCommand, sessionsOpen: sessionsOpen, modelPickerOpen: modelPickerOpen, modelPickerStage: modelPickerStage, modelPickerLoading: modelPickerLoading, modelPickerError: modelPickerError, modelOptions: filteredModelOptions, modelSelectedIndex: modelSelectedIndex, currentModel: getConfig()?.model ?? '', currentReasoningEffort: getConfig()?.reasoningEffort, modelQuery: modelQuery, modelEffortOptions: modelEffortOptions, onModelMove: handleModelMove, onModelSelect: handleModelSelect, onModelClose: handleModelClose, onModelQueryChange: handleModelQueryChange }), sessionsOpen && (_jsx(SessionsModal, { currentSessionId: currentSessionId, onResume: (nextSessionId) => {
                    setCurrentSessionId(nextSessionId);
                    setTranscript(loadTranscript(nextSessionId));
                    setSessionsOpen(false);
                }, onRename: (transcriptId, nextName) => {
                    const renamed = renameTranscript(transcriptId, nextName);
                    if (!renamed) {
                        return false;
                    }
                    if (transcriptId === currentSessionId) {
                        setCurrentSessionId(renamed);
                    }
                    return true;
                }, onDelete: (transcriptId) => {
                    const deleted = deleteTranscript(transcriptId);
                    if (!deleted) {
                        return;
                    }
                    if (transcriptId === currentSessionId) {
                        const nextSessionId = createSessionId();
                        setCurrentSessionId(nextSessionId);
                        setTranscript([]);
                        saveTranscript(nextSessionId, []);
                    }
                }, onClose: () => setSessionsOpen(false) }))] }));
};
