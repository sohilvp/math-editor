// Editor.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import MathEditor from './MathEditor';
import 'react-quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import MarkdownPreview from './MarkdownPreview';

// ✅ Register custom toolbar icon BEFORE component renders
const icons = Quill.import('ui/icons');
icons['customFormula'] = '<span style="font-weight:bold;">∑</span>'; // Custom icon

const Editor = () => {
  const [editorHtml, setEditorHtml] = useState('');
  const [placeholder] = useState('Write something...');
  const [mathEditorVisible, setMathEditorVisible] = useState(false);
  const [expressionEditable, setExpressionEditable] = useState(false);
  const [editingFormulaIndex, setEditingFormulaIndex] = useState(null);
  const [editingLatex, setEditingLatex] = useState('');
  const quillRef = useRef(null);

  const handleChange = (html) => {
    setEditorHtml(html);
  };

  const handleInsertFormula = (latex) => {
    // Remove leading/trailing $$ if present
    let cleanLatex = latex.trim();
    if (cleanLatex.startsWith('$$') && cleanLatex.endsWith('$$')) {
      cleanLatex = cleanLatex.slice(2, -2).trim();
    }

    // Check if the formula uses a large operator and needs display style
    const needsDisplayStyle = /\\(sum|int|prod|lim)/.test(cleanLatex);
    const finalLatex = needsDisplayStyle ? `\\displaystyle ${cleanLatex}` : cleanLatex;

    const quill = quillRef.current.getEditor();
    if (expressionEditable && editingFormulaIndex !== null) {
      const ops = quill.getContents().ops;
      let formulaCount = -1;
      let indexToReplace = 0;

      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        if (op.insert && op.insert.formula) {
          formulaCount++;
          if (formulaCount === editingFormulaIndex) break;
        }
        indexToReplace += typeof op.insert === 'string' ? op.insert.length : 1;
      }

      quill.deleteText(indexToReplace, 1, 'user');
      quill.insertEmbed(indexToReplace, 'formula', finalLatex, 'user');
      quill.insertText(indexToReplace + 1, ' ', 'user');
      quill.setSelection(indexToReplace + 2, 0, 'user');
    } else {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'formula', finalLatex, 'user');
      quill.insertText(range.index + 1, ' ', 'user');
      quill.setSelection(range.index + 2, 0, 'user');
    }

    setMathEditorVisible(false);
    setExpressionEditable(false);
    setEditingFormulaIndex(null);
    setEditingLatex(''); // Clear input after save
  };

  const handleCustomFormula = () => {
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection(true);
    const formula = '\\displaystyle \\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}';

    quill.insertEmbed(range.index, 'formula', formula, 'user');
    quill.insertText(range.index + 1, ' ', 'user');
    quill.setSelection(range.index + 2, 0, 'user');
  };

  const toggleMathEditor = (e) => {
    if (e) e.preventDefault();
    setMathEditorVisible((prev) => !prev);
    setExpressionEditable(false);
  };

  useEffect(() => {
    const formulaButton = document.querySelector('button.ql-formula');
    const customFormulaButton = document.querySelector('button.ql-customFormula');
    const tooltipElement = document.querySelector('.ql-tooltip');

    if (tooltipElement) {
      tooltipElement.style.opacity = '0';
      tooltipElement.style.display = 'none';
    }

    if (formulaButton) {
      formulaButton.onclick = null;
      formulaButton.addEventListener('click', toggleMathEditor);
    }

    if (customFormulaButton) {
      customFormulaButton.onclick = null;
      customFormulaButton.addEventListener('click', handleCustomFormula);
    }

    return () => {
      if (formulaButton) formulaButton.removeEventListener('click', toggleMathEditor);
      if (customFormulaButton) customFormulaButton.removeEventListener('click', handleCustomFormula);
    };
  }, []);

  // Attach formula editing logic directly (double-click to edit)
  useEffect(() => {
    const formulaSpans = document.querySelectorAll('.ql-editor .ql-formula');
    formulaSpans.forEach((span, idx) => {
      // Remove previous handler if any
      span.ondblclick = null;
      span.onmouseenter = null;
      span.onmouseleave = null;

      // Add border on hover
      span.onmouseenter = (e) => {
        e.target.style.border = 'solid 1px rgba(240, 198, 116, 0.99)';
        e.target.style.padding = '2px 0';
      };
      span.onmouseleave = (e) => {
        e.target.style.border = '';
        e.target.style.padding = '';
      };

      // Double click to edit
      span.ondblclick = (e) => {
        e.stopPropagation();
        setMathEditorVisible(true);
        setExpressionEditable(true);
        setEditingFormulaIndex(idx);
        setEditingLatex(span.getAttribute('data-value') || ''); // Prefill with formula latex
      };
    });

    // Cleanup
    return () => {
      formulaSpans.forEach((span) => {
        span.ondblclick = null;
        span.onmouseenter = null;
        span.onmouseleave = null;
      });
    };
  }, [editorHtml]);

  const uploadImageToGCP = useCallback(async (file) => {
    // Step 1: Upload the file and get its GCS path.
    // IMPORTANT: This assumes your backend '/api/upload' endpoint is modified
    // to return a JSON response like { "filePath": "your-file-path-in-gcs" }.
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      let errorDetails = '';
      try {
        const errorData = await uploadResponse.json();
        errorDetails = errorData.error || JSON.stringify(errorData);
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(`Upload failed: ${uploadResponse.statusText}. ${errorDetails}`.trim());
    }

    const uploadData = await uploadResponse.json();
    const gcsPath = uploadData.filePath; // Expecting { filePath: "..." }

    if (!gcsPath) {
      console.error('Backend /api/upload did not return filePath. Response:', uploadData);
      throw new Error('Failed to get GCS path from upload response. Ensure backend returns { "filePath": "..." } from /api/upload.');
    }

    // Step 2: Get a signed URL for the uploaded file using its GCS path.
    // This calls the '/api/get-public-url' endpoint from your backend code.
    const signedUrlResponse = await fetch('http://localhost:3001/api/get-public-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filePath: gcsPath }),
    });

    if (!signedUrlResponse.ok) {
      let errorDetails = '';
      try {
        const errorData = await signedUrlResponse.json();
        errorDetails = errorData.error || errorData.details || JSON.stringify(errorData);
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(`Failed to get signed URL: ${signedUrlResponse.statusText}. ${errorDetails}`.trim());
    }

    const signedUrlData = await signedUrlResponse.json();
    
    if (!signedUrlData.signedUrls || signedUrlData.signedUrls.length === 0) {
        console.error('Backend /api/get-public-url did not return signedUrls array or it was empty. Response:', signedUrlData);
        throw new Error('Failed to get signed URL from response. Ensure backend returns { "signedUrls": ["url", ...] } from /api/get-public-url.');
    }
    
    return signedUrlData.signedUrls[0]; // Return the first URL from the array
  }, []);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file && quillRef.current) {
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);

        // Show a temporary placeholder/loading image if desired
        // quill.insertEmbed(range.index, 'image', 'loading-image-url', 'user');

        try {
          const url = await uploadImageToGCP(file);
          quill.insertEmbed(range.index, 'image', url, 'user');
          quill.setSelection(range.index + 1, 0, 'user');
        } catch (err) {
          alert('Image upload failed');
        }
      }
    };
  }, [uploadImageToGCP]);

  // ✅ Toolbar modules moved inside the component and memoized
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }], // More header levels
        // [{ 'font': [] }], // Font family removed
        [{ 'size': ['small', false, 'large', 'huge'] }], // Font size removed
        // [{ 'align': [] }], // Alignment removed
        ['bold', 'italic', 'underline'], // Strike removed
        // [{ 'color': [] }, { 'background': [] }], // Text color and background removed
        ['blockquote', ], // Blockquote and code block 'code-block'
        [{ 'list': 'ordered' }, { 'list': 'bullet' }], // Indent removed
        // [{ 'script': 'sub'}, { 'script': 'super' }], // Subscript/superscript removed
        // [{ 'direction': 'rtl' }], // Text direction removed
        ['link', 'image', 'video'], // Add video
        ['formula', 'customFormula'],
        ['clean'],
      ],
      handlers: {
        link: function(value) {
          if (value) {
            const quill = this.quill;
            const range = quill.getSelection();
            let preview = '';
            if (range && range.length > 0) {
              preview = quill.getText(range.index, range.length);
            }
            const url = prompt('Enter the URL', preview.startsWith('http') ? preview : 'https://');
            if (url) {
              quill.format('link', url);
            }
          } else {
            this.quill.format('link', false);
          }
        },
        image: imageHandler, // Now correctly references memoized imageHandler
      }
    }
  }), [imageHandler]);

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, paddingRight: '16px', borderRight: '1px solid #eee' }}>
        <ReactQuill
          ref={quillRef}
          onChange={handleChange}
          value={editorHtml}
          modules={modules} // Use the modules defined in the component
          bounds=".app"
          placeholder={placeholder}
        />
        {mathEditorVisible && (
          <MathEditor
            onSaveFormula={handleInsertFormula}
            setMathEditorVisible={setMathEditorVisible}
            expressionEditable={expressionEditable}
            setExpressionEditable={setExpressionEditable}
            initialLatex={editingLatex} // Pass latex to MathEditor
          />
        )}
      </div>
      <div style={{ flex: 1, paddingLeft: '16px', background: '#fafbfc' }}>
        <MarkdownPreview html={editorHtml} />
      </div>
    </div>
  );
};

export default Editor;