import React, { Component } from 'react'

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, color: '#E17055', background: '#1A1A1A', fontFamily: 'monospace', height: '100vh' }}>
          <h1>Render Error</h1>
          <p>{this.state.error.message}</p>
          <pre style={{ marginTop: 16, fontSize: 12, color: '#666666', whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
