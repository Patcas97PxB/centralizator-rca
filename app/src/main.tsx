import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ESTE_DEMO } from './lib/demo'
import { pornesteProtectieDemo } from './lib/demo-protectie'

if (ESTE_DEMO) {
  pornesteProtectieDemo()
  document.title = 'Centralizator RCA — variantă de test'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
