import { createContext, useContext } from 'react';
const UIStateContext = createContext(null);
export const UIStateProvider = UIStateContext.Provider;
export function useUIState() {
    const value = useContext(UIStateContext);
    if (!value) {
        throw new Error('useUIState must be used within UIStateProvider');
    }
    return value;
}
