import { marked } from 'marked';
import { highlight } from 'cli-highlight';
export function renderMarkdown(md) {
    const raw = marked.parse(md, { async: false });
    const plain = raw
        // headings → text + single newline
        .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, c) => c.replace(/<[^>]+>/g, '').trim() + '\n')
        // paragraphs → content + single newline
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, c) => c.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim() + '\n')
        // list items → bullet + newline
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => '• ' + c.replace(/<[^>]+>/g, '').trim() + '\n')
        // blockquote
        .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, c) => c.replace(/<[^>]+>/g, '').trim() + '\n')
        // strip remaining tags
        .replace(/<[^>]+>/g, '')
        // decode entities
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // collapse 3+ consecutive newlines to exactly 2 (one blank line max)
        .replace(/\n{3,}/g, '\n\n')
        // no leading/trailing blank lines
        .trim();
    try {
        return highlight(plain, { language: 'markdown', ignoreIllegals: true });
    }
    catch {
        return plain;
    }
}
