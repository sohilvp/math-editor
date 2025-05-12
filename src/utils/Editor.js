export const editExpression = (setMathEditorVisible, setExpressionEditable, setEditingFormulaIndex) => {
  const expressions = document.querySelectorAll('span.ql-formula');
  expressions.forEach((expression, idx) => {
    const latexValue = expression.getAttribute('data-value');

    expression.removeEventListener('mouseenter', addBorder);
    expression.removeEventListener('mouseleave', removeBorder);
    expression.removeEventListener('dblclick', expression._dblClickHandler);

    expression._dblClickHandler = () => {
      expression.setAttribute('id', 'editable');
      enterEditMode(latexValue);
      setMathEditorVisible(true);
      setExpressionEditable(true);
      setEditingFormulaIndex(idx); // Track which formula is being edited
    };

    expression.addEventListener('mouseenter', addBorder);
    expression.addEventListener('mouseleave', removeBorder);
    expression.addEventListener('dblclick', expression._dblClickHandler);
  });
};

export const addBorder = (event) => {
  const element = event.target;
  element.style.border = 'solid 1px rgba(240, 198, 116, 0.99)';
  element.style.padding = '2px 0';
};

export const removeBorder = (event) => {
  const element = event.target;
  element.style.border = '';
};

export const enterEditMode = (latexValue) => {
  const mathField = document.getElementById('mathField');
  const latexOutput = document.getElementById('latex');
  if (mathField && latexOutput) {
    mathField.setValue(latexValue);
    latexOutput.value = latexValue;
    mathField.focus();
  }
};
