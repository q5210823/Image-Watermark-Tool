import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import './styles/global.css'

// Global error handler for uncaught errors
window.onerror = (msg, url, line, col, err) => {
  console.error(`[GLOBAL] Uncaught error: ${msg} at ${url}:${line}:${col}`, err?.stack)
}
window.addEventListener('unhandledrejection', (e) => {
  console.error(`[GLOBAL] Unhandled rejection: ${e.reason}`, e.reason?.stack)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
