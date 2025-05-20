// MarkdownRenderer.js
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// Function to fetch markdown from API
const fetchMarkdown = async (filePath) => {
  const response = await fetch('http://localhost:3001/api/get-markdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({  filePath:"text-editor_app/usersmarkdown/markdown-1747738247845.md" }),
  });
  if (!response.ok) throw new Error('Failed to fetch markdown');
  const data = await response.json();
  return data.markdown; // assuming API returns { markdown: "..." }
};

// Function to get public URL for an image filename
const getImagePublicUrl = async (filename) => {
    console.log("filename", filename);
    
  const response = await fetch('http://localhost:3001/api/get-public-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath: filename }),
  });
  if (!response.ok) throw new Error('Failed to fetch image URL');
  const data = await response.json();
  // Use the first signed URL if available
  return data.signedUrls && data.signedUrls.length > 0 ? data.signedUrls[0] : null;
};

const MarkdownRenderer = ({ filePath = '' }) => {
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState(null);
  const [imageUrls, setImageUrls] = useState({});

  useEffect(() => {
    fetchMarkdown(filePath)
      .then(setMarkdown)
      .catch((err) => setError(err.message));
  }, [filePath]);

  // Find all image filenames in the markdown and fetch their URLs
  useEffect(() => {
    const regex = /!\[[^\]]*\]\((upload-img-[^)]+)\)/g;
    const matches = [...markdown.matchAll(regex)];
    const filenames = matches.map((m) => m[1]);
    const uniqueFilenames = [...new Set(filenames)];

    uniqueFilenames.forEach((filename) => {   
      if (!imageUrls[filename]) {
        getImagePublicUrl(filename)
          .then((url) => {
            setImageUrls((prev) => ({ ...prev, [filename]: url }));
          })
          .catch(() => {
            setImageUrls((prev) => ({ ...prev, [filename]: null }));
          });
      }
    });
    // eslint-disable-next-line
  }, [markdown]);

  if (error) return <div>Error: {error}</div>;

  // Custom image and math renderer
  const components = {
    img: ({ src, alt }) => {
      // Normalize src to remove leading './' or '/'
      const normalizedSrc = src?.replace(/^\.?\//, '');
      if (normalizedSrc && normalizedSrc.startsWith('upload-img-')) {
        const publicUrl = imageUrls[normalizedSrc];
        if (publicUrl === undefined) {
          return <span>Loading image...</span>;
        }
        if (publicUrl === null) {
          return <span>Image not found</span>;
        }
        return <img src={publicUrl} alt={alt} style={{ maxWidth: '100%' }} />;
      }
      return <img src={src} alt={alt} style={{ maxWidth: '100%' }} />;
    },
    math: ({ value, node }) => {
      // If the math node is not surrounded by blank lines, render inline
      // node.position.start/position.end gives us line/column info
      // We'll check if the parent is a paragraph (inline context)
      if (node?.position?.start?.line === node?.position?.end?.line) {
        // Single line, treat as inline
        return <InlineMath math={value} />;
      }
      // Otherwise, treat as block
      return <BlockMath math={value} />;
    },
    inlineMath: ({ value }) => <InlineMath math={value} />,
  };

  return (
    <div style={{ padding: 16 }}>
      <ReactMarkdown
        components={components}
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
