// Editor.js
import React, { useState, useEffect, useRef } from 'react';
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

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <div style={{ flex: 1, paddingRight: '16px', borderRight: '1px solid #eee' }}>
        <ReactQuill
          ref={quillRef}
          onChange={handleChange}
          value={editorHtml}
          modules={Editor.modules}
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

// ✅ Toolbar modules
Editor.modules = {
  toolbar: {
    container: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['link', 'image'], // Add link and image icons
      [{ list: 'ordered' }, { list: 'bullet' }], // Add list icons
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
      }
    }
  }
};

export default Editor;