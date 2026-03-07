import React, { createContext, useContext } from 'react';

export type TerminalStateValue = {
  columns: number;
  rows: number;
};

const TerminalContext = createContext<TerminalStateValue | null>(null);

export const TerminalProvider = TerminalContext.Provider;

export function useTerminalState(): TerminalStateValue {
  const value = useContext(TerminalContext);
  if (!value) {
    throw new Error('useTerminalState must be used within TerminalProvider');
  }
  return value;
}
