// Editor.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import MathEditor from './MathEditor';
import 'react-quill/dist/quill.snow.css';
import 'katex/dist/katex.min.css';
import MarkdownPreview from './MarkdownPreview';
import { v4 as uuidv4 } from 'uuid';
import MarkdownRenderer from './MarkDownRenderer';

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
  const [pendingImages, setPendingImages] = useState({}); // { [uploadId]: File }
  const quillRef = useRef(null);

  console.log("pendingImages", pendingImages);
  
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

  const uploadImageToGCP = useCallback(async (file, uploadId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadId', uploadId); // Pass uploadId

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

        // Generate a unique id for this image
        const uploadId = `upload-img-${uuidv4()}`;

        // Use FileReader to read the file as a data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;

          // Insert image with a custom attribute to identify it later
          quill.insertEmbed(range.index, 'image', dataUrl, 'user');
          setTimeout(() => {
            const editor = quillRef.current && quillRef.current.editor && quillRef.current.editor.root;
            if (editor) {
              const imgs = editor.querySelectorAll(`img[src="${dataUrl}"]`);
              imgs.forEach(imgEl => {
                imgEl.setAttribute('data-upload-id', uploadId);
                imgEl.style.opacity = '0.7';
                imgEl.setAttribute('alt', 'Uploading...');
              });
            }
          }, 0);

          quill.setSelection(range.index + 1, 0, 'user');
          setPendingImages(prev => ({ ...prev, [uploadId]: file }));
        };
        reader.onerror = () => {
          alert('Failed to load image preview.');
        };
        reader.readAsDataURL(file);
      }
    };
  }, []);

  // Upload all pending images to GCP and replace their src in the editor
  const handleUploadAllImages = useCallback(async () => {
    if (!quillRef.current) return;
    // const quill = quillRef.current.getEditor();
    // const editor = quillRef.current.editor.root;

    for (const [uploadId, file] of Object.entries(pendingImages)) {
      try {
        // Upload to GCP
        const url = await uploadImageToGCP(file, uploadId); // Pass uploadId here

        // Do NOT update the image src or alt in the editor after upload
        // Only remove the data-upload-id and opacity

        const editor = quillRef.current && quillRef.current.editor && quillRef.current.editor.root;
        if (editor) {
          const imgs = editor.querySelectorAll(`img[data-upload-id="${uploadId}"]`);
          imgs.forEach(img => {
            // Do not change src or alt!
            img.style.opacity = ''; // remove opacity
            img.removeAttribute('data-upload-id');
            // Do not set alt to uploadId, keep as is (alt stays 'Uploading...' or empty)
          });
        }

        // Remove from pendingImages
        setPendingImages(prev => {
          const copy = { ...prev };
          delete copy[uploadId];
          return copy;
        });
      } catch (err) {
        alert(`Image upload failed for one image: ${err.message}`);
      }
    }
  }, [pendingImages, uploadImageToGCP]);

  // Remove deleted images from pendingImages
  useEffect(() => {
    if (!quillRef.current) return;
    const editor = quillRef.current.editor && quillRef.current.editor.root;
    if (!editor) return;

    // Collect all current upload-ids in the editor
    const imgs = editor.querySelectorAll('img[data-upload-id]');
    const presentIds = new Set();
    imgs.forEach(img => {
      const id = img.getAttribute('data-upload-id');
      if (id) presentIds.add(id);
    });

    // Remove any pendingImages not present in the editor
    setPendingImages(prev => {
      const next = {};
      for (const id in prev) {
        if (presentIds.has(id)) next[id] = prev[id];
      }
      return next;
    });
  }, [editorHtml]);

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
        {/* Always show Upload Images Button, disable if no pending images */}
        <button
          onClick={handleUploadAllImages}
          style={{
            marginBottom: 8,
            background: Object.keys(pendingImages).length > 0 ? '#ffe082' : '#eee',
            border: 'none',
            padding: '6px 12px',
            borderRadius: 4,
            cursor: Object.keys(pendingImages).length > 0 ? 'pointer' : 'not-allowed',
            color: Object.keys(pendingImages).length > 0 ? '#333' : '#aaa'
          }}
          disabled={Object.keys(pendingImages).length === 0}
        >
          Upload Images
          {Object.keys(pendingImages).length > 0 && (
            <> ({Object.keys(pendingImages).length})</>
          )}
        </button>
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