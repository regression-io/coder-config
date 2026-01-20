/**
 * Simple markdown formatter for documentation content.
 * Converts markdown text to HTML for rendering.
 */
export function formatMarkdown(text) {
  // Process fenced code blocks FIRST (before inline code)
  let result = text.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    // Unescape nested backticks and escape HTML
    const unescaped = code.replace(/\\\`/g, '`');
    const escaped = unescaped.replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    return `<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto my-4"><code class="text-sm">${escaped}</code></pre>`;
  });

  // Process markdown tables (header | separator | rows)
  result = result.replace(/(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g, (tableMatch) => {
    const lines = tableMatch.trim().split('\n');
    if (lines.length < 2) return tableMatch;

    const headerCells = lines[0].split('|').filter(c => c.trim()).map(c =>
      `<th class="border border-border px-3 py-2 bg-muted font-semibold text-left">${c.trim()}</th>`
    ).join('');

    const bodyRows = lines.slice(2).map(line => {
      const cells = line.split('|').filter(c => c.trim()).map(c =>
        `<td class="border border-border px-3 py-2">${c.trim()}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    return `<table class="w-full border-collapse border border-border my-4"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  return result
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2 text-foreground">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4 text-foreground">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-6 text-foreground">$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg shadow-lg my-4 max-w-full border border-border" />')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="list-disc my-2">$&</ul>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-3 text-foreground">')
    .replace(/\n/g, '<br/>');
}
