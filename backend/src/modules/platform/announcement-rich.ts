import { TipTapDoc, TipTapNode } from '../../utils/tiptap';

/**
 * Structural whitelist sanitizer for announcement rich bodies.
 * Only the node/mark types the announcement editor offers survive; everything
 * else (images, tables, unknown extensions, javascript: links) is stripped.
 * Returns null when the input is not a usable Tiptap doc at all.
 */

const ALLOWED_BLOCKS = new Set([
  'paragraph', 'bulletList', 'orderedList', 'listItem', 'heading', 'hardBreak',
  'blockquote', 'codeBlock', 'horizontalRule',
]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code', 'link']);

function sanitizeMarks(marks: unknown): any[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: any[] = [];
  for (const mark of marks) {
    if (!mark || typeof mark !== 'object' || !ALLOWED_MARKS.has((mark as any).type)) continue;
    if ((mark as any).type === 'link') {
      const href = String((mark as any).attrs?.href ?? '');
      if (!/^https?:\/\//i.test(href)) continue; // http(s) links only
      out.push({ type: 'link', attrs: { href, target: '_blank', rel: 'noopener noreferrer' } });
    } else {
      out.push({ type: (mark as any).type });
    }
  }
  return out.length > 0 ? out : undefined;
}

function sanitizeNode(node: unknown): TipTapNode | null {
  if (!node || typeof node !== 'object') return null;
  const n = node as any;

  if (n.type === 'text') {
    if (typeof n.text !== 'string' || n.text.length === 0) return null;
    const marks = sanitizeMarks(n.marks);
    return { type: 'text', text: n.text, ...(marks ? { marks } : {}) };
  }

  if (!ALLOWED_BLOCKS.has(n.type)) return null;

  const out: TipTapNode = { type: n.type };
  if (n.type === 'heading') {
    const level = Number(n.attrs?.level);
    out.attrs = { level: level >= 1 && level <= 3 ? level : 2 };
  }
  if (Array.isArray(n.content)) {
    const children = n.content.map(sanitizeNode).filter(Boolean) as TipTapNode[];
    if (children.length > 0) out.content = children;
  }
  return out;
}

export function sanitizeAnnouncementRich(input: unknown): TipTapDoc | null {
  if (!input || typeof input !== 'object') return null;
  const doc = input as any;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null;

  const content = doc.content.map(sanitizeNode).filter(Boolean) as TipTapNode[];
  if (content.length === 0) return null;
  return { type: 'doc', content };
}
