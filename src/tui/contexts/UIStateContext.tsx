import React, { createContext, useContext } from 'react';
import type { ModelOption, ReasoningEffort } from '../../services/llm/modelCapabilities.js';
import type { RewindEntry } from '../../app/controller/sessionController.js';

export type UIStateValue = {
  sessionsOpen: boolean;
  rewindOpen: boolean;
  rewindEntries: RewindEntry[];
  rewindSelectedIndex: number;
  modelPickerOpen: boolean;
  modelPickerStage: 'model' | 'effort';
  modelPickerLoading: boolean;
  modelPickerError: string | null;
  modelOptions: ModelOption[];
  modelSelectedIndex: number;
  currentModel: string;
  currentReasoningEffort?: ReasoningEffort;
  modelQuery: string;
  modelEffortOptions: ReasoningEffort[];
};

const UIStateContext = createContext<UIStateValue | null>(null);

export const UIStateProvider = UIStateContext.Provider;

export function useUIState(): UIStateValue {
  const value = useContext(UIStateContext);
  if (!value) {
    throw new Error('useUIState must be used within UIStateProvider');
  }
  return value;
}
