import React, { createContext, useContext } from 'react';

export type UIActionsValue = {
  onRewindOpen: () => void;
  onRewindClose: () => void;
  onRewindMove: (direction: -1 | 1) => void;
  onRewindSelect: () => void;
  onModelMove: (direction: -1 | 1) => void;
  onModelSelect: () => void;
  onModelClose: () => void;
  onModelQueryChange: (query: string) => void;
};

const UIActionsContext = createContext<UIActionsValue | null>(null);

export const UIActionsProvider = UIActionsContext.Provider;

export function useUIActions(): UIActionsValue {
  const value = useContext(UIActionsContext);
  if (!value) {
    throw new Error('useUIActions must be used within UIActionsProvider');
  }
  return value;
}
