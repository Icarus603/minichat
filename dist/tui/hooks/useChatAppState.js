import { useRef, useState } from 'react';
import { readConfig } from '../../services/storage/configStore.js';
import { buildErrorTranscript, buildInterruptedTranscript, runChatTurn, } from '../../app/controller/chatController.js';
import { executeCommand } from '../../app/controller/commandController.js';
import { applyModelSelection, getModelEffortOptions, loadModelPickerState, shouldOpenEffortStage, } from '../../app/controller/modelController.js';
import { createEmptySession, deleteSession, loadSession, persistSession, renameSession, replaceDeletedCurrentSession, } from '../../app/controller/sessionController.js';
export function useChatAppState({ sessionId, initialTranscript, onAuthAction, onExit, }) {
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
    const filteredModelOptions = modelOptions.filter((model) => model.id.toLowerCase().includes(modelQuery.trim().toLowerCase()));
    const isInterruptedError = (error) => {
        if (!(error instanceof Error))
            return false;
        return error.name === 'AbortError' ||
            error.message === 'Request interrupted' ||
            error.message.toLowerCase().includes('aborted');
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
    const handleSend = async (input) => {
        if (loading)
            return;
        const userMsg = { role: 'user', content: input };
        const updated = [...transcript, userMsg];
        const requestController = new AbortController();
        activeRequestRef.current = requestController;
        setTranscript(updated);
        persistSession(currentSessionId, updated);
        setLoading(true);
        setLoadingState({ message: 'thinking…', blinking: true });
        try {
            const config = readConfig();
            if (!config) {
                throw new Error('Missing configuration. Re-run setup.');
            }
            const result = await runChatTurn(transcript, input, config, requestController.signal);
            setTranscript(result.transcript);
            persistSession(currentSessionId, result.transcript);
        }
        catch (err) {
            if (isInterruptedError(err)) {
                const interrupted = buildInterruptedTranscript(updated);
                setTranscript(interrupted);
                persistSession(currentSessionId, interrupted);
                return;
            }
            const final = buildErrorTranscript(updated, err);
            setTranscript(final);
            persistSession(currentSessionId, final);
        }
        finally {
            if (activeRequestRef.current === requestController) {
                activeRequestRef.current = null;
            }
            setLoading(false);
            setLoadingState(null);
        }
    };
    const openModelPicker = async () => {
        setModelPickerOpen(true);
        setModelPickerStage('model');
        setModelPickerLoading(true);
        setModelPickerError(null);
        setModelQuery('');
        setModelEffortOptions([]);
        setPendingModel(null);
        try {
            const { config, models } = await loadModelPickerState();
            if (!config) {
                setModelOptions([]);
                setModelSelectedIndex(0);
                return;
            }
            setModelOptions(models);
            const currentIndex = models.findIndex((model) => model.id === config.model);
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
    const handleCommand = (commandName) => {
        const action = executeCommand(commandName);
        if (!action)
            return;
        if (action.type === 'open-model-picker')
            return void openModelPicker();
        if (action.type === 'new-session') {
            const nextSession = createEmptySession();
            setCurrentSessionId(nextSession.sessionId);
            setTranscript(nextSession.transcript);
            return;
        }
        if (action.type === 'open-sessions')
            return void setSessionsOpen(true);
        if (action.type === 'auth')
            return void onAuthAction(action.action);
        if (action.type === 'clear-transcript') {
            setTranscript([]);
            persistSession(currentSessionId, []);
            return;
        }
        if (action.type === 'exit-app') {
            onExit();
        }
    };
    const handleModelMove = (direction) => {
        setModelSelectedIndex((index) => {
            const length = modelPickerStage === 'effort' ? modelEffortOptions.length : filteredModelOptions.length;
            if (length === 0)
                return 0;
            return Math.max(0, Math.min(length - 1, index + direction));
        });
    };
    const handleModelClose = () => {
        if (modelPickerStage === 'effort') {
            const config = readConfig();
            const currentIndex = config
                ? filteredModelOptions.findIndex((model) => model.id === (pendingModel ?? config.model))
                : -1;
            setModelPickerStage('model');
            setModelSelectedIndex(currentIndex >= 0 ? currentIndex : 0);
            return;
        }
        closeModelPicker();
    };
    const handleModelSelect = () => {
        const config = readConfig();
        const selectedModelId = modelPickerStage === 'model'
            ? filteredModelOptions[modelSelectedIndex]?.id
            : pendingModel;
        if (!config || !selectedModelId) {
            handleModelClose();
            return;
        }
        if (modelPickerStage === 'model') {
            if (shouldOpenEffortStage(selectedModelId)) {
                const effortOptions = getModelEffortOptions(selectedModelId);
                setPendingModel(selectedModelId);
                setModelEffortOptions(effortOptions);
                setModelPickerStage('effort');
                const currentEffort = config.reasoningEffort;
                const currentEffortIndex = currentEffort ? effortOptions.findIndex((option) => option === currentEffort) : -1;
                setModelSelectedIndex(currentEffortIndex >= 0 ? currentEffortIndex : 0);
                return;
            }
            const message = applyModelSelection(selectedModelId);
            setTranscript((current) => [...current, { role: 'ai', content: message }]);
            closeModelPicker();
            return;
        }
        const selectedEffort = modelEffortOptions[modelSelectedIndex];
        const message = applyModelSelection(selectedModelId, selectedEffort);
        setTranscript((current) => [...current, { role: 'ai', content: message }]);
        closeModelPicker();
    };
    const handleSessionResume = (nextSessionId) => {
        setCurrentSessionId(nextSessionId);
        setTranscript(loadSession(nextSessionId));
        setSessionsOpen(false);
    };
    const handleSessionRename = (sessionToRename, nextName) => {
        const renamed = renameSession(sessionToRename, nextName);
        if (!renamed)
            return false;
        if (sessionToRename === currentSessionId) {
            setCurrentSessionId(renamed);
        }
        return true;
    };
    const handleSessionDelete = (sessionToDelete) => {
        const deleted = deleteSession(sessionToDelete);
        if (!deleted)
            return;
        if (sessionToDelete === currentSessionId) {
            const nextSession = replaceDeletedCurrentSession();
            setCurrentSessionId(nextSession.sessionId);
            setTranscript(nextSession.transcript);
        }
    };
    return {
        currentSessionId,
        transcript,
        loading,
        loadingState,
        sessionsOpen,
        modelPickerOpen,
        modelPickerStage,
        modelPickerLoading,
        modelPickerError,
        filteredModelOptions,
        modelSelectedIndex,
        modelQuery,
        modelEffortOptions,
        handleSend,
        handleInterrupt: () => activeRequestRef.current?.abort(),
        handleCommand,
        handleModelMove,
        handleModelSelect,
        handleModelClose,
        handleModelQueryChange: (query) => {
            setModelQuery(query);
            setModelSelectedIndex(0);
        },
        handleSessionResume,
        handleSessionRename,
        handleSessionDelete,
        handleSessionsClose: () => setSessionsOpen(false),
    };
}
