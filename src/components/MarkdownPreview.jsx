// MarkdownPreview.js
import React from 'react';
import TurndownService from 'turndown';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const htmlToMarkdown = (html) => {
  const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    strongDelimiter: '**',
    bulletListMarker: '-',
  });

  turndownService.addRule('underline', {
    filter: ['u'],
    replacement: (content) => `_${content}_`,
  });

  turndownService.addRule('formula', {
    filter: (node) =>
      node.nodeName === 'SPAN' &&
      node.classList.contains('ql-formula') &&
      node.getAttribute('data-value'),
    replacement: (content, node) => {
      const latex = node.getAttribute('data-value') || '';
      return `$$\n${latex}\n$$`;
    },
  });

  return turndownService.turndown(html).trim();
};

const MarkdownPreview = ({ html }) => {
  const markdown = htmlToMarkdown(html);
  const lines = markdown.split('\n');

  return (
    <div>
      <h3>Markdown Output</h3>
      <div
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          background: '#f6f8fa',
          padding: '12px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        {lines.map((line, index) => {
          const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;
          const parts = [];
          let lastIndex = 0;
          let match;

          while ((match = blockMathRegex.exec(line)) !== null) {
            parts.push(line.substring(lastIndex, match.index));
            parts.push(<BlockMath key={`block-${index}-${match.index}`} math={match[1]} />);
            lastIndex = blockMathRegex.lastIndex;
          }
          parts.push(line.substring(lastIndex));

          return <div key={index}>{parts}</div>;
        })}
      </div>
    </div>
  );
};

export default MarkdownPreview;