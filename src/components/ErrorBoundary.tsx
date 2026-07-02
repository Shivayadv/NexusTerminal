import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Top-level React error boundary. Catches synchronous render errors and
 * replaces the crashed subtree with a fallback UI instead of a blank screen.
 *
 * Uncaught async errors (unhandledrejection) are handled separately in main.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to main process logger if the IPC bridge is available
    try {
      window.electron.log.write('error', 'Renderer:ErrorBoundary', error.message, {
        stack: error.stack,
        componentStack: info.componentStack,
      })
    } catch { /* IPC unavailable during very early crashes */ }

    console.error('[ErrorBoundary]', error, info)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return this.props.fallback ?? <DefaultFallback error={this.state.error} />
    }
    return this.props.children
  }
}

function DefaultFallback({ error }: { error: Error }) {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Something went wrong</h1>
      <p style={styles.message}>{error.message}</p>
      <p style={styles.hint}>
        Open DevTools (Ctrl+Shift+I) for details or restart the application.
      </p>
      <button
        style={styles.button}
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0d0d0d',
    color: '#e2e2e2',
    fontFamily: 'system-ui, sans-serif',
    gap: '12px',
    padding: '32px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#ff5555',
    margin: 0,
  },
  message: {
    fontSize: '14px',
    color: '#6e6e6e',
    fontFamily: 'monospace',
    background: '#141414',
    padding: '12px 16px',
    borderRadius: '6px',
    maxWidth: '600px',
    wordBreak: 'break-all',
    margin: 0,
  },
  hint: {
    fontSize: '12px',
    color: '#6e6e6e',
    margin: 0,
  },
  button: {
    marginTop: '8px',
    padding: '8px 20px',
    background: '#00d4aa',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
