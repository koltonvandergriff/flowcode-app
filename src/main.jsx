import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/tokens.css';
import { initGlasshouseTheme } from './lib/glasshouseTheme';

initGlasshouseTheme();

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
