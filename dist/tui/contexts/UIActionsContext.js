import { createContext, useContext } from 'react';
const UIActionsContext = createContext(null);
export const UIActionsProvider = UIActionsContext.Provider;
export function useUIActions() {
    const value = useContext(UIActionsContext);
    if (!value) {
        throw new Error('useUIActions must be used within UIActionsProvider');
    }
    return value;
}
