import React from 'react';
import TurndownService from 'turndown';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const htmlToMarkdown = (html) => {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
  });

  // Add rule for underline: convert <u>...</u> to _..._ in markdown
  turndownService.addRule('underline', {
    filter: ['u'],
    replacement: function(content) {
      return `_${content}_`;
    }
  });

  // Rule to convert Quill's formula spans to LaTeX Markdown
  turndownService.addRule('formula', {
    filter: (node) =>
      node.nodeName === 'SPAN' &&
      node.classList.contains('ql-formula') &&
      node.getAttribute('data-value'),
    replacement: (content, node) => {
      const latex = node.getAttribute('data-value') || '';
      const isBlock = latex.includes('\n') || latex.includes('\\begin');

      // Use block math syntax for multiline or environment equations
      return isBlock ? `\n\n$$\n${latex}\n$$\n\n` : `$${latex}$`;
    }
  });

  return turndownService.turndown(html).trim();
};

const MarkdownPreview = ({ html }) => {
  // Convert HTML to Markdown (with LaTeX code)
  const markdown = htmlToMarkdown(html);

  return (
    <div>
      <h3>Markdown Output</h3>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: '#f6f8fa',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}
      >
        {markdown}
      </pre>
    </div>
  );
};

export default MarkdownPreview;
