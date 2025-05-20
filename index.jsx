import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';

import katex from 'katex';
import 'katex/dist/katex.min.css';

window.katex = katex; // ← This is required for ReactQuill formulas

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
