import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import './animations.css';
import App from './App';
import { initAnalytics } from './utils/analytics';

initAnalytics();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App/></React.StrictMode>);
