import { marked } from 'marked';
import { highlight } from 'cli-highlight';
export function renderMarkdown(md) {
    const raw = marked.parse(md, { async: false });
    const plain = raw
        .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, c) => c.replace(/<[^>]+>/g, '').trim() + '\n')
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => c.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() + '\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => '• ' + c.replace(/<[^>]+>/g, '').trim() + '\n')
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => c.replace(/<[^>]+>/g, '').trim() + '\n')
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
    }
    catch {
        return plain;
    }
}
