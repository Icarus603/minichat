import { createContext, useContext } from 'react';
const TerminalContext = createContext(null);
export const TerminalProvider = TerminalContext.Provider;
export function useTerminalState() {
    const value = useContext(TerminalContext);
    if (!value) {
        throw new Error('useTerminalState must be used within TerminalProvider');
    }
    return value;
}
