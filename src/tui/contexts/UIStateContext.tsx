import React, { createContext, useContext } from 'react';
import type { ModelOption, ReasoningEffort } from '../../services/llm/modelCapabilities.js';

export type UIStateValue = {
  sessionsOpen: boolean;
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
