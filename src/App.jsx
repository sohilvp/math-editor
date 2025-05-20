import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MarkDownRenderer from './maths/components/MarkDownRenderer';
import Editor from './maths/components/Editor';


function App() {
  return (
    <Router>
      <Routes>
        <Route  exact path="/" element={<Editor/>} />
        <Route path="/renderedview" element={<MarkDownRenderer />} />
      </Routes>
    </Router>
  );
}

export default App;