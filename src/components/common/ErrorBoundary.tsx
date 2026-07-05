import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // Log to console with full details
    console.error(`[ERROR] [ErrorBoundary] ${error.message}`)
    console.error(`[ERROR] [ErrorBoundary] Stack: ${error.stack}`)
    console.error(`[ERROR] [ErrorBoundary] Component Stack: ${errorInfo.componentStack}`)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: 40, textAlign: 'center', gap: 16,
          background: 'var(--bg-primary)', color: 'var(--text-primary)'
        }}>
          <AlertTriangle size={48} style={{ color: 'var(--warning)' }} />
          <h2 style={{ margin: 0 }}>Oops! Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: 500, fontSize: 'var(--font-size-sm)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          {this.state.errorInfo && (
            <pre style={{
              fontSize: 11, textAlign: 'left', maxWidth: 600, maxHeight: 200, overflow: 'auto',
              padding: 12, borderRadius: 6, background: 'var(--bg-elevated)', color: 'var(--text-secondary)'
            }}>
              {this.state.errorInfo.componentStack}
            </pre>
          )}
          <button className='btn-primary' onClick={this.handleReset} style={{ marginTop: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
