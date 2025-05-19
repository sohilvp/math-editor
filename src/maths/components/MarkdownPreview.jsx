// MarkdownPreview.js
import React from 'react';
import TurndownService from 'turndown';
import 'katex/dist/katex.min.css';

// Keywords that typically indicate block math
const blockMathKeywords = [
  '\\frac',
  '\\sum',
  '\\int',
  '\\sqrt',
  '\\begin',
  '\\displaystyle',
];

const htmlToMarkdown = (html) => {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
  });

  // Convert underline
  turndownService.addRule('underline', {
    filter: ['u'],
    replacement: (content) => `_${content}_`,
  });

  // Formula conversion based on content
  turndownService.addRule('formula', {
    filter: (node) =>
      node.nodeName === 'SPAN' &&
      node.classList.contains('ql-formula') &&
      node.getAttribute('data-value'),
    replacement: (content, node) => {
      const latex = node.getAttribute('data-value')?.trim() || '';

      const isBlock = blockMathKeywords.some((kw) =>
        latex.startsWith(kw)
      );

      return isBlock ? `\n$$\n${latex}\n$$\n` : `$${latex}$`;
    },
  });

  return turndownService.turndown(html).trim();
};

const MarkdownPreview = ({ html }) => {
  const markdown = htmlToMarkdown(html);

  // Match and separate block math
  const segments = markdown.split(/(\$\$[\s\S]*?\$\$)/g);

  // Download handler
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'output.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'relative', paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, flex: 1 }}>Markdown Output</h3>
        <button
          onClick={handleDownload}
          style={{
            marginLeft: '12px',
            padding: '6px 16px',
            background: '#f6c674',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Download Markdown
        </button>
      </div>
      <div
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: '#f6f8fa',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}
      >
        {segments.map((segment, idx) => {
          const blockMatch = segment.match(/^\$\$[\s\S]*\$\$$/);

          if (blockMatch) {
            return (
              <div
                key={`latex-block-${idx}`}
                style={{ color: '#b80000', fontWeight: 'bold', margin: '8px 0' }}
              >
                {segment}
              </div>
            );
          } else {
            return segment.split('\n').map((line, i) => (
              <div key={`text-${idx}-${i}`}>{line}</div>
            ));
          }
        })}
      </div>
    </div>
  );
};

export default MarkdownPreview;
