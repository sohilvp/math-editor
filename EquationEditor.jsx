import React from 'react';

function EquationEditor() {
  const handleInsertEquation = (equation) => {
    console.log('Inserted equation:', equation);
  };

  const handleSave = () => {
    console.log('Saved content');
  };

  return (
    <div>
      <button onClick={() => handleInsertEquation('f(x)=ax^2+bx')}>
        Insert Equation
      </button>
      <button onClick={handleSave}>
        Save
      </button>
    </div>
  );
}

export default EquationEditor;