import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import MathEditor from './MathEditor';
import { editExpression, addBorder, removeBorder } from '../utils/Editor';
import 'react-quill/dist/quill.snow.css';
// Editor.js
import katex from 'katex';
import 'katex/dist/katex.min.css';
// Optional: window.katex = katex; only if you're sure Quill requires it globally

const Editor = () => {
  const [editorHtml, setEditorHtml] = useState('');
  const [placeholder] = useState('Write something...');
  const [mathEditorVisible, setMathEditorVisible] = useState(false);
  const [expressionEditable, setExpressionEditable] = useState(false);
  const [editingFormulaIndex, setEditingFormulaIndex] = useState(null);
  const quillRef = useRef(null);

  const handleChange = (html) => {
    setEditorHtml(html);
  };

  const handleInsertFormula = (latex) => {
    const quill = quillRef.current.getEditor();
    if (expressionEditable && editingFormulaIndex !== null) {
      // Find all formulas in the editor
      const ops = quill.getContents().ops;
      let formulaCount = -1;
      let indexToReplace = 0;
      for (let i = 0, idx = 0; i < ops.length; i++) {
        const op = ops[i];
        if (op.insert && op.insert.formula) {
          formulaCount++;
          if (formulaCount === editingFormulaIndex) {
            // Found the formula to replace
            break;
          }
        }
        if (typeof op.insert === 'string') {
          indexToReplace += op.insert.length;
        } else {
          indexToReplace += 1;
        }
      }
      // Remove the old formula and insert the new one
      quill.deleteText(indexToReplace, 1, 'user');
      quill.insertEmbed(indexToReplace, 'formula', latex, 'user');
    } else {
      const range = quill.getSelection(true);
      quill.insertEmbed(range.index, 'formula', latex, 'user');
    }
    setMathEditorVisible(false);
    setExpressionEditable(false);
    setEditingFormulaIndex(null);
  };

  const toggleMathEditor = (e) => {
    if (e) e.preventDefault();
    setMathEditorVisible((prevVisible) => !prevVisible);
    setExpressionEditable(false);
  };

  useEffect(() => {
    editExpression(setMathEditorVisible, setExpressionEditable, setEditingFormulaIndex);

    const formulaButton = document.querySelector('button.ql-formula');
    const tooltipElement = document.querySelector('.ql-tooltip');

    if (tooltipElement) {
      tooltipElement.style.opacity = '0';
      tooltipElement.style.display = 'none'; // Hides default tooltip
    }

    if (formulaButton) {
      formulaButton.onclick = null;
      formulaButton.addEventListener('click', toggleMathEditor);
    }

    return () => {
      if (formulaButton) {
        formulaButton.removeEventListener('click', toggleMathEditor);
      }
      const expressions = document.querySelectorAll('span.ql-formula');
      expressions.forEach((expression) => {
        expression.removeEventListener('mouseenter', addBorder);
        expression.removeEventListener('mouseleave', removeBorder);
      });
    };
  }, [editorHtml]);

  return (
    <div className="app">
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
        />
      )}
    </div>
  );
};

Editor.modules = {
  toolbar: [
    [{ header: [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    ['formula'],
    ['clean'],
  ],
};

// NOTE: If you see a warning about a component being `contentEditable` and containing React children,
// it is likely from the <math-field> element in MathEditor.jsx. To suppress the warning, add
// suppressContentEditableWarning={true} to the <math-field> element in MathEditor.jsx.

export default Editor;
