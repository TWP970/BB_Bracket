// main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { TournamentProvider } from './context/TournamentContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TournamentProvider>
      <App />
    </TournamentProvider>
  </StrictMode>
);
