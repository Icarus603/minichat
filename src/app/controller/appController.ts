export type AppScreen = 'update' | 'setup' | 'resume' | 'chat' | 'exit';

export function resolveNextScreen(options: {
  hasConfig: boolean;
  shouldResume: boolean;
  hasUpdate: boolean;
}): AppScreen {
  if (options.hasUpdate) {
    return 'update';
  }
  if (!options.hasConfig) {
    return 'setup';
  }
  if (options.shouldResume) {
    return 'resume';
  }
  return 'chat';
}
