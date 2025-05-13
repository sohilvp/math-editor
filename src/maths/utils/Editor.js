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
