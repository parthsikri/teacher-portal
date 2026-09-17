import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { purgeLegacyWebDevMockData } from './services/webDevService'

// Ensure any stale legacy browser localStorage cache is wiped on startup
purgeLegacyWebDevMockData();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

