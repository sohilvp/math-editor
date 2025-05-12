import React, { useEffect, useRef, useState } from 'react';
import 'mathlive';
import '../../styles/MathEditor.css';
import { handleClick, updateLatexOutput } from '../utils/Math';

const MathEditor = ({
  onSaveFormula,
  setMathEditorVisible,
  expressionEditable,
  setExpressionEditable
}) => {
  const [latex, setLatex] = useState('');
  const mathFieldRef = useRef(null);

  useEffect(() => {
    const mathElement = document.getElementById('math');
    const mathField = mathFieldRef.current;
    const latexOutput = document.getElementById('latex');
    const root = document.getElementById('root');

    if (mathElement) mathElement.isStyleChanged = false;

    const handleClickEvent = (event) => {
      handleClick(event, mathField, mathElement);
    };

    const updateLatexOutputEvent = () => {
      setLatex(mathField.value || '');
      updateLatexOutput(mathField, latexOutput, setLatex);
    };

    if (root) root.addEventListener('click', handleClickEvent);
    if (mathField) {
      mathField.addEventListener('input', updateLatexOutputEvent);
      // Set initial value only once
      mathField.value = latex;
    }

    return () => {
      if (root) root.removeEventListener('click', handleClickEvent);
      if (mathField) mathField.removeEventListener('input', updateLatexOutputEvent);
    };
    // eslint-disable-next-line
  }, []);

  // Keep math-field value in sync with state
  useEffect(() => {
    if (mathFieldRef.current && mathFieldRef.current.value !== latex) {
      mathFieldRef.current.value = latex;
    }
  }, [latex]);

  const handleSave = () => {
    onSaveFormula(latex);
  };

  return (
    <div id="math" className="math-editor-modal">
      <math-field
        id="mathField"
        ref={mathFieldRef}
        tabIndex={0}
        suppressContentEditableWarning={true}
        style={{ width: '100%', minHeight: '40px' }}
      />
      <textarea
        id="latex"
        className="output"
        value={latex}
        readOnly
        spellCheck="false"
      />
      <div className="buttons">
        <button
          className="mathButton cancelButton"
          onClick={() => setMathEditorVisible(false)}
        >
          Cancel
        </button>
        <button
          className="mathButton saveButton"
          onClick={handleSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default MathEditor;
