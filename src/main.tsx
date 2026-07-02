import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@app/App'
import { ErrorBoundary } from '@components/ErrorBoundary'
import '@assets/styles/global.css'

// Forward uncaught async errors to the main-process logger.
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason)
  try {
    window.electron.log.write('error', 'Renderer', 'Unhandled promise rejection', { reason: msg })
  } catch { /* IPC not ready */ }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
