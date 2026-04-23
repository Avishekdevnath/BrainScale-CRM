/**
 * Utilities for converting between plain text and a minimal TipTap JSON representation,
 * and for extracting readable plain text from TipTap JSON.
 */

export type TipTapNode = {
  type: string;
  attrs?: Record<string, any>;
  marks?: any[];
  text?: string;
  content?: TipTapNode[];
};

export type TipTapDoc = {
  type: 'doc';
  content?: TipTapNode[];
};

/**
 * Convert a plain text string into a minimal TipTap JSON (doc -> paragraph -> text).
 * Preserves paragraph breaks by splitting on double newlines.
 */
export function fromPlainTextToTiptap(text: string): TipTapDoc {
  if (!text) return { type: 'doc', content: [] };

  // Normalize CRLF to LF
  const normalized = text.replace(/\r\n/g, '\n');

  // Split on two or more newlines to get paragraphs
  const paragraphs = normalized.split(/\n{2,}/g);

  const content: TipTapNode[] = paragraphs.flatMap((para) => {
    // For each paragraph, preserve single newlines as hard_breaks
    if (!para) return [{ type: 'paragraph', content: [] }];

    const parts = para.split('\n');
    const nodes: TipTapNode[] = [];

    parts.forEach((part, i) => {
      if (i > 0) {
        nodes.push({ type: 'hard_break' });
      }
      if (part) {
        nodes.push({ type: 'text', text: part });
      }
    });

    return [{ type: 'paragraph', content: nodes }];
  });

  return { type: 'doc', content };
}

/**
 * Extract readable plain text from TipTap JSON.
 * This is intentionally conservative: it strips formatting and outputs a human-friendly
 * plain-text representation suitable for CSV/exports or previews.
 */
export function tiptapToPlainText(input: unknown): string {
  if (!input) return '';

  // If input is a JSON string, try to parse it
  let root: any = input;
  if (typeof input === 'string') {
    try {
      root = JSON.parse(input);
    } catch (e) {
      // not JSON — return as-is
      return String(input);
    }
  }

  // If it looks like a TipTap doc wrapper, use it; otherwise attempt to treat the root as content array
  const content = Array.isArray(root?.content) ? root.content : Array.isArray(root) ? root : [];

  function walkNodes(nodes: any[]): string {
    if (!nodes || nodes.length === 0) return '';
    const out: string[] = [];

    for (const node of nodes) {
      if (!node || typeof node !== 'object') continue;

      switch (node.type) {
        case 'text':
          if (typeof node.text === 'string') {
            out.push(node.text);
          }
          break;
        case 'paragraph':
          out.push(walkNodes(node.content ?? []));
          out.push('\n\n');
          break;
        case 'heading':
          out.push(walkNodes(node.content ?? []));
          out.push('\n\n');
          break;
        case 'bullet_list':
          {
            const items = node.content ?? [];
            for (const li of items) {
              const text = walkNodes(li.content ?? []);
              const prefixed = text
                .split('\n')
                .filter(Boolean)
                .map((l) => `- ${l}`)
                .join('\n');
              out.push(prefixed);
              out.push('\n');
            }
            out.push('\n');
          }
          break;
        case 'ordered_list':
          {
            const items = node.content ?? [];
            for (let i = 0; i < items.length; i++) {
              const li = items[i];
              const text = walkNodes(li.content ?? []);
              const prefixed = text
                .split('\n')
                .filter(Boolean)
                .map((l) => `${i + 1}. ${l}`)
                .join('\n');
              out.push(prefixed);
              out.push('\n');
            }
            out.push('\n');
          }
          break;
        case 'list_item':
          out.push(walkNodes(node.content ?? []));
          out.push('\n');
          break;
        case 'code_block':
          if (typeof node.text === 'string') {
            out.push(node.text);
            out.push('\n\n');
          } else {
            out.push(walkNodes(node.content ?? []));
            out.push('\n\n');
          }
          break;
        case 'blockquote':
          {
            const text = walkNodes(node.content ?? []);
            const quoted = text
              .split('\n')
              .filter(Boolean)
              .map((l) => `> ${l}`)
              .join('\n');
            out.push(quoted);
            out.push('\n\n');
          }
          break;
        case 'hard_break':
          out.push('\n');
          break;
        case 'horizontal_rule':
          out.push('\n---\n');
          break;
        case 'image':
          out.push(node.attrs?.alt ?? node.attrs?.title ?? node.attrs?.src ?? '');
          break;
        default:
          // Generic: walk children
          if (Array.isArray(node.content)) {
            out.push(walkNodes(node.content));
          }
      }
    }

    return out.join('');
  }

  const raw = walkNodes(content);

  // Clean up: remove excessive blank lines and trim
  const cleaned = raw.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trim();
  return cleaned;
}

export default {
  fromPlainTextToTiptap,
  tiptapToPlainText,
};
