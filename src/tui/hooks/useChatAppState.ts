import { useRef, useState } from 'react';
import { readConfig } from '../../services/storage/configStore.js';
import type { ChatMessage } from '../../shared/chat.js';
import type { ModelOption, ReasoningEffort } from '../../services/llm/modelCapabilities.js';
import {
  buildErrorTranscript,
  buildInterruptedTranscript,
  runChatTurn,
} from '../../app/controller/chatController.js';
import { executeCommand } from '../../app/controller/commandController.js';
import {
  applyModelSelection,
  getModelEffortOptions,
  loadModelPickerState,
  shouldOpenEffortStage,
} from '../../app/controller/modelController.js';
import {
  createEmptySession,
  deleteSession,
  listRewindEntries,
  loadSession,
  persistSession,
  renameSession,
  replaceDeletedCurrentSession,
  rewindTranscript,
} from '../../app/controller/sessionController.js';

type LoadingState = { message: string; blinking: boolean } | null;

type AuthAction = 'login' | 'logout';

export type UseChatAppStateOptions = {
  sessionId: string;
  initialTranscript: ChatMessage[];
  onAuthAction: (action: AuthAction) => void;
  onExit: () => void;
};

export type UseChatAppStateResult = {
  currentSessionId: string;
  transcript: ChatMessage[];
  loading: boolean;
  loadingState: LoadingState;
  sessionsOpen: boolean;
  rewindOpen: boolean;
  rewindEntries: ReturnType<typeof listRewindEntries>;
  rewindSelectedIndex: number;
  modelPickerOpen: boolean;
  modelPickerStage: 'model' | 'effort';
  modelPickerLoading: boolean;
  modelPickerError: string | null;
  filteredModelOptions: ModelOption[];
  modelSelectedIndex: number;
  modelQuery: string;
  modelEffortOptions: ReasoningEffort[];
  handleSend: (input: string) => Promise<void>;
  handleInterrupt: () => void;
  handleCommand: (commandName: string) => void;
  handleModelMove: (direction: -1 | 1) => void;
  handleModelSelect: () => void;
  handleModelClose: () => void;
  handleModelQueryChange: (query: string) => void;
  handleSessionResume: (sessionId: string) => void;
  handleSessionRename: (sessionId: string, nextName: string) => boolean;
  handleSessionDelete: (sessionId: string) => void;
  handleSessionsClose: () => void;
  handleRewindOpen: () => void;
  handleRewindClose: () => void;
  handleRewindMove: (direction: -1 | 1) => void;
  handleRewindSelect: () => void;
};

export function useChatAppState({
  sessionId,
  initialTranscript,
  onAuthAction,
  onExit,
}: UseChatAppStateOptions): UseChatAppStateResult {
  const activeRequestRef = useRef<AbortController | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);
  const [transcript, setTranscript] = useState<ChatMessage[]>(initialTranscript);
  const [loading, setLoading] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerStage, setModelPickerStage] = useState<'model' | 'effort'>('model');
  const [modelPickerLoading, setModelPickerLoading] = useState(false);
  const [modelPickerError, setModelPickerError] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([]);
  const [modelSelectedIndex, setModelSelectedIndex] = useState(0);
  const [modelQuery, setModelQuery] = useState('');
  const [modelEffortOptions, setModelEffortOptions] = useState<ReasoningEffort[]>([]);
  const [pendingModel, setPendingModel] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [rewindOpen, setRewindOpen] = useState(false);
  const [rewindSelectedIndex, setRewindSelectedIndex] = useState(0);
  const [loadingState, setLoadingState] = useState<LoadingState>(null);
  const rewindEntries = listRewindEntries(transcript);

  const filteredModelOptions = modelOptions.filter((model) =>
    model.id.toLowerCase().includes(modelQuery.trim().toLowerCase()),
  );

  const isInterruptedError = (error: unknown) => {
    if (!(error instanceof Error)) return false;
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

  const closeRewind = () => {
    setRewindOpen(false);
    setRewindSelectedIndex(0);
  };

  const handleSend = async (input: string) => {
    if (loading) return;

    const userMsg: ChatMessage = { role: 'user', content: input };
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
    } catch (err) {
      if (isInterruptedError(err)) {
        const interrupted = buildInterruptedTranscript(updated);
        setTranscript(interrupted);
        persistSession(currentSessionId, interrupted);
        return;
      }

      const final = buildErrorTranscript(updated, err);
      setTranscript(final);
      persistSession(currentSessionId, final);
    } finally {
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
    } catch (error) {
      setModelOptions([]);
      setModelSelectedIndex(0);
      setModelPickerError(error instanceof Error ? error.message : String(error));
    } finally {
      setModelPickerLoading(false);
    }
  };

  const handleCommand = (commandName: string) => {
    const action = executeCommand(commandName);
    if (!action) return;

    if (action.type === 'open-model-picker') return void openModelPicker();
    if (action.type === 'new-session') {
      const nextSession = createEmptySession();
      setCurrentSessionId(nextSession.sessionId);
      setTranscript(nextSession.transcript);
      return;
    }
    if (action.type === 'open-sessions') return void setSessionsOpen(true);
    if (action.type === 'auth') return void onAuthAction(action.action);
    if (action.type === 'clear-transcript') {
      setTranscript([]);
      persistSession(currentSessionId, []);
      return;
    }
    if (action.type === 'exit-app') {
      onExit();
    }
  };

  const handleModelMove = (direction: -1 | 1) => {
    setModelSelectedIndex((index) => {
      const length = modelPickerStage === 'effort' ? modelEffortOptions.length : filteredModelOptions.length;
      if (length === 0) return 0;
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

  const handleSessionResume = (nextSessionId: string) => {
    setCurrentSessionId(nextSessionId);
    setTranscript(loadSession(nextSessionId));
    setSessionsOpen(false);
  };

  const handleSessionRename = (sessionToRename: string, nextName: string) => {
    const renamed = renameSession(sessionToRename, nextName);
    if (!renamed) return false;
    if (sessionToRename === currentSessionId) {
      setCurrentSessionId(renamed);
    }
    return true;
  };

  const handleSessionDelete = (sessionToDelete: string) => {
    const deleted = deleteSession(sessionToDelete);
    if (!deleted) return;
    if (sessionToDelete === currentSessionId) {
      const nextSession = replaceDeletedCurrentSession();
      setCurrentSessionId(nextSession.sessionId);
      setTranscript(nextSession.transcript);
    }
  };

  const handleRewindOpen = () => {
    if (loading || rewindEntries.length === 0) {
      return;
    }
    setRewindOpen(true);
    setRewindSelectedIndex(Math.max(0, rewindEntries.length - 1));
  };

  const handleRewindSelect = () => {
    const selected = rewindEntries[rewindSelectedIndex];
    if (!selected) {
      closeRewind();
      return;
    }

    const nextTranscript = rewindTranscript(transcript, selected.transcriptIndex);
    setTranscript(nextTranscript);
    persistSession(currentSessionId, nextTranscript);
    closeRewind();
  };

  return {
    currentSessionId,
    transcript,
    loading,
    loadingState,
    sessionsOpen,
    rewindOpen,
    rewindEntries,
    rewindSelectedIndex,
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
    handleModelQueryChange: (query: string) => {
      setModelQuery(query);
      setModelSelectedIndex(0);
    },
    handleSessionResume,
    handleSessionRename,
    handleSessionDelete,
    handleSessionsClose: () => setSessionsOpen(false),
    handleRewindOpen,
    handleRewindClose: closeRewind,
    handleRewindMove: (direction: -1 | 1) => {
      setRewindSelectedIndex((index) => {
        if (rewindEntries.length === 0) {
          return 0;
        }
        return Math.max(0, Math.min(rewindEntries.length - 1, index + direction));
      });
    },
    handleRewindSelect,
  };
}
