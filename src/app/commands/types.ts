export type CommandDefinition = {
  name: string;
  description: string;
};

export type CommandAction =
  | { type: 'open-model-picker' }
  | { type: 'new-session' }
  | { type: 'open-sessions' }
  | { type: 'auth'; action: 'login' | 'logout' }
  | { type: 'clear-transcript' }
  | { type: 'exit-app' };
