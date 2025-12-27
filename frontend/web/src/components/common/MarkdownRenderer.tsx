"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Enhanced markdown renderer for AI chat messages
 * Supports: **bold**, *italic*, numbered/bullet lists, headers, code blocks, tables, links, blockquotes
 */
export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Split content into lines for processing
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inNumberedList = false;
  let inBulletList = false;
  let inCodeBlock = false;
  let inBlockquote = false;
  let codeBlockLines: string[] = [];
  let blockquoteLines: string[] = [];
  let numberedItems: React.ReactNode[] = [];
  let bulletItems: React.ReactNode[] = [];
  let tableRows: string[][] = [];
  let tableHeaders: string[] | null = null;
  let inTable = false;

  const closeLists = (key: string) => {
    const result: React.ReactNode[] = [];
    if (inNumberedList && numberedItems.length > 0) {
      result.push(
        <ol key={`numbered-${key}`} className="list-decimal space-y-1 my-2 ml-6">
          {numberedItems}
        </ol>
      );
      numberedItems = [];
      inNumberedList = false;
    }
    if (inBulletList && bulletItems.length > 0) {
      result.push(
        <ul key={`bullet-${key}`} className="list-disc space-y-1 my-2 ml-6">
          {bulletItems}
        </ul>
      );
      bulletItems = [];
      inBulletList = false;
    }
    return result;
  };

  const closeCodeBlock = (key: string) => {
    if (inCodeBlock && codeBlockLines.length > 0) {
      const code = codeBlockLines.join("\n");
      codeBlockLines = [];
      inCodeBlock = false;
      return (
        <pre key={`code-${key}`} className="bg-[var(--groups1-secondary)] rounded-lg p-4 my-3 overflow-x-auto">
          <code className="text-sm font-mono text-[var(--groups1-text)] whitespace-pre">
            {code}
          </code>
        </pre>
      );
    }
    return null;
  };

  const closeBlockquote = (key: string) => {
    if (inBlockquote && blockquoteLines.length > 0) {
      const quote = blockquoteLines.join(" ");
      blockquoteLines = [];
      inBlockquote = false;
      return (
        <blockquote key={`quote-${key}`} className="border-l-4 border-[var(--groups1-primary)] pl-4 my-3 italic text-[var(--groups1-text-secondary)]">
          {processInlineMarkdown(quote)}
        </blockquote>
      );
    }
    return null;
  };

  const closeTable = (key: string) => {
    if (inTable && tableHeaders && tableRows.length > 0) {
      inTable = false;
      const headers = tableHeaders;
      const rows = tableRows;
      tableHeaders = null;
      tableRows = [];
      return (
        <div key={`table-${key}`} className="my-3 overflow-x-auto">
          <table className="min-w-full border-collapse border border-[var(--groups1-border)] rounded-lg">
            <thead>
              <tr className="bg-[var(--groups1-secondary)]">
                {headers.map((header, idx) => (
                  <th key={idx} className="border border-[var(--groups1-border)] px-4 py-2 text-left font-semibold text-[var(--groups1-text)]">
                    {processInlineMarkdown(header.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-[var(--groups1-secondary)]">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className="border border-[var(--groups1-border)] px-4 py-2 text-[var(--groups1-text)]">
                      {processInlineMarkdown(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return null;
  };

  const processLine = (line: string, index: number) => {
    const trimmed = line.trim();
    
    // Check for code block start/end
    if (trimmed.startsWith("```")) {
      const codeBlock = closeCodeBlock(`before-${index}`);
      inCodeBlock = !inCodeBlock;
      return codeBlock ? [codeBlock] : [];
    }
    
    // If inside code block, collect lines
    if (inCodeBlock) {
      codeBlockLines.push(line);
      return [];
    }
    
    // Check for blockquote
    if (trimmed.startsWith(">")) {
      const previousElements: React.ReactNode[] = [];
      previousElements.push(...closeLists(`before-${index}`));
      const codeBlock = closeCodeBlock(`before-${index}`);
      if (codeBlock) previousElements.push(codeBlock);
      const table = closeTable(`before-${index}`);
      if (table) previousElements.push(table);
      
      inBlockquote = true;
      blockquoteLines.push(trimmed.substring(1).trim());
      return previousElements;
    }
    
    // Close blockquote if we're not in one anymore
    if (inBlockquote && !trimmed.startsWith(">")) {
      const quote = closeBlockquote(`before-${index}`);
      const lists = closeLists(`before-${index}`);
      const codeBlock = closeCodeBlock(`before-${index}`);
      const table = closeTable(`before-${index}`);
      return [quote, ...lists, codeBlock, table].filter(Boolean);
    }
    
    // Check for table (simple markdown table: | col1 | col2 |)
    if (trimmed.includes("|") && trimmed.split("|").length >= 3) {
      const previousElements: React.ReactNode[] = [];
      previousElements.push(...closeLists(`before-${index}`));
      const codeBlock = closeCodeBlock(`before-${index}`);
      if (codeBlock) previousElements.push(codeBlock);
      const quote = closeBlockquote(`before-${index}`);
      if (quote) previousElements.push(quote);
      
      const cells = trimmed.split("|").map(c => c.trim()).filter(c => c);
      
      // Check if it's a header separator (|---|---|)
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        inTable = true;
        return previousElements;
      }
      
      if (inTable) {
        if (!tableHeaders) {
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return previousElements;
      }
    } else if (inTable) {
      // Close table if we're not in one anymore
      const table = closeTable(`before-${index}`);
      const lists = closeLists(`before-${index}`);
      const codeBlock = closeCodeBlock(`before-${index}`);
      const quote = closeBlockquote(`before-${index}`);
      return [table, ...lists, codeBlock, quote].filter(Boolean);
    }
    
    // Check if line is a numbered list item
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const previousElements: React.ReactNode[] = [];
      previousElements.push(...closeLists(`before-${index}`));
      const codeBlock = closeCodeBlock(`before-${index}`);
      if (codeBlock) previousElements.push(codeBlock);
      const quote = closeBlockquote(`before-${index}`);
      if (quote) previousElements.push(quote);
      const table = closeTable(`before-${index}`);
      if (table) previousElements.push(table);
      
      inNumberedList = true;
      const itemNumber = parseInt(numberedMatch[1], 10);
      const itemText = processInlineMarkdown(numberedMatch[2]);
      numberedItems.push(
        <li key={index} value={itemNumber}>
          {itemText}
        </li>
      );
      return previousElements;
    }
    
    // Check if line is a bullet list item
    const bulletMatch = trimmed.match(/^(\-|\*)\s+(.+)$/);
    if (bulletMatch) {
      const previousElements: React.ReactNode[] = [];
      previousElements.push(...closeLists(`before-${index}`));
      const codeBlock = closeCodeBlock(`before-${index}`);
      if (codeBlock) previousElements.push(codeBlock);
      const quote = closeBlockquote(`before-${index}`);
      if (quote) previousElements.push(quote);
      const table = closeTable(`before-${index}`);
      if (table) previousElements.push(table);
      
      inBulletList = true;
      const itemText = processInlineMarkdown(bulletMatch[2]);
      bulletItems.push(
        <li key={index}>
          {itemText}
        </li>
      );
      return previousElements;
    }
    
    // Close any open structures
    const closedLists = closeLists(`at-${index}`);
    const codeBlock = closeCodeBlock(`at-${index}`);
    const quote = closeBlockquote(`at-${index}`);
    const table = closeTable(`at-${index}`);
    
    // Check if line is empty
    if (!trimmed) {
      const allClosed = [...closedLists, codeBlock, quote, table].filter(Boolean);
      return allClosed.length > 0 ? allClosed : <br key={index} />;
    }
    
    // Check if line is a header (starts with #)
    const headerMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = processInlineMarkdown(headerMatch[2]);
      const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      return [
        ...closedLists,
        codeBlock,
        quote,
        table,
        <HeaderTag key={index} className={`font-semibold my-2 ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
          {text}
        </HeaderTag>
      ].filter(Boolean);
    }
    
    // Process regular paragraph
    return [
      ...closedLists,
      codeBlock,
      quote,
      table,
      <p key={index} className="my-1.5 leading-relaxed">
        {processInlineMarkdown(trimmed)}
      </p>
    ].filter(Boolean);
  };

  // Process all lines
  lines.forEach((line, index) => {
    const element = processLine(line, index);
    if (Array.isArray(element)) {
      elements.push(...element);
    } else if (element) {
      elements.push(element);
    }
  });

  // Close any remaining structures
  const finalLists = closeLists("final");
  const finalCodeBlock = closeCodeBlock("final");
  const finalQuote = closeBlockquote("final");
  const finalTable = closeTable("final");
  elements.push(...finalLists);
  if (finalCodeBlock) elements.push(finalCodeBlock);
  if (finalQuote) elements.push(finalQuote);
  if (finalTable) elements.push(finalTable);

  return <div className={className}>{elements}</div>;
}

/**
 * Process inline markdown (bold, italic, links, inline code)
 */
function processInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let key = 0;
  let remainingText = text;

  // Process all markdown patterns: links, bold, italic, inline code
  while (remainingText.length > 0) {
    // Match links first: [text](url)
    const linkMatch = remainingText.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Match bold: **text**
    const boldMatch = remainingText.match(/\*\*([^*]+)\*\*/);
    // Match italic: *text* (but not **text**)
    const italicMatch = remainingText.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
    // Match inline code: `code`
    const codeMatch = remainingText.match(/`([^`]+)`/);

    // Find the earliest match
    let earliestMatch: { type: string; match: RegExpMatchArray; index: number } | null = null;

    if (linkMatch && linkMatch.index !== undefined) {
      earliestMatch = { type: 'link', match: linkMatch, index: linkMatch.index };
    }
    if (boldMatch && boldMatch.index !== undefined) {
      if (!earliestMatch || boldMatch.index < earliestMatch.index) {
        earliestMatch = { type: 'bold', match: boldMatch, index: boldMatch.index };
      }
    }
    if (italicMatch && italicMatch.index !== undefined) {
      if (!earliestMatch || italicMatch.index < earliestMatch.index) {
        earliestMatch = { type: 'italic', match: italicMatch, index: italicMatch.index };
      }
    }
    if (codeMatch && codeMatch.index !== undefined) {
      if (!earliestMatch || codeMatch.index < earliestMatch.index) {
        earliestMatch = { type: 'code', match: codeMatch, index: codeMatch.index };
      }
    }

    if (earliestMatch) {
      // Add text before the match
      if (earliestMatch.index > 0) {
        const beforeText = remainingText.substring(0, earliestMatch.index);
        if (beforeText) {
          parts.push(<span key={`text-${key++}`}>{beforeText}</span>);
        }
      }

      // Process the match
      if (earliestMatch.type === 'link') {
        const url = earliestMatch.match[2];
        const linkText = earliestMatch.match[1];
        parts.push(
          <a
            key={`link-${key++}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--groups1-primary)] hover:underline underline-offset-2"
          >
            {linkText}
          </a>
        );
        remainingText = remainingText.substring(earliestMatch.index + earliestMatch.match[0].length);
      } else if (earliestMatch.type === 'bold') {
        parts.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {earliestMatch.match[1]}
          </strong>
        );
        remainingText = remainingText.substring(earliestMatch.index + earliestMatch.match[0].length);
      } else if (earliestMatch.type === 'italic') {
        parts.push(
          <em key={`italic-${key++}`} className="italic">
            {earliestMatch.match[1]}
          </em>
        );
        remainingText = remainingText.substring(earliestMatch.index + earliestMatch.match[0].length);
      } else if (earliestMatch.type === 'code') {
        parts.push(
          <code key={`code-${key++}`} className="bg-[var(--groups1-secondary)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--groups1-text)]">
            {earliestMatch.match[1]}
          </code>
        );
        remainingText = remainingText.substring(earliestMatch.index + earliestMatch.match[0].length);
      }
    } else {
      // No more matches, add remaining text
      if (remainingText) {
        parts.push(<span key={`text-${key++}`}>{remainingText}</span>);
      }
      break;
    }
  }

  // If no markdown was found, return the original text
  if (parts.length === 0) {
    return [<span key="text-0">{text}</span>];
  }

  return parts;
}

