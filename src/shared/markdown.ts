import { marked } from 'marked';
import { highlight } from 'cli-highlight';

export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string;

  const plain = raw
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_: string, c: string) =>
      c.replace(/<[^>]+>/g, '').trim() + '\n'
    )
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_: string, c: string) =>
      c.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() + '\n'
    )
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_: string, c: string) =>
      '• ' + c.replace(/<[^>]+>/g, '').trim() + '\n'
    )
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_: string, c: string) =>
      c.replace(/<[^>]+>/g, '').trim() + '\n'
    )
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  try {
    return highlight(plain, { language: 'markdown', ignoreIllegals: true });
  } catch {
    return plain;
  }
}
