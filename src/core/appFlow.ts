export type ChatAppResult = 'exit' | 'login' | 'logout';
export type PostChatAction = 'exit' | 'setup' | 'stop';

export function resolvePostChatAction(result: ChatAppResult): PostChatAction {
  if (result === 'exit') {
    return 'exit';
  }

  if (result === 'login') {
    return 'setup';
  }

  return 'stop';
}
