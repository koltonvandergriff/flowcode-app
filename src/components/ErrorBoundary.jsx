import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const message = error?.message || String(error);
    const stack = error?.stack || '';
    const componentStack = errorInfo?.componentStack || '';

    if (window.flowade?.crash?.log) {
      window.flowade.crash.log('error', message, { stack, componentStack });
    } else {
      console.error(`[ErrorBoundary:${this.props.name}]`, message, { stack, componentStack });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: '#1e2028',
          border: '1px solid #2a2b3d',
          borderRadius: 8,
          height: '100%',
          minHeight: 80,
          gap: 12,
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#9ca3af',
            letterSpacing: 0.5,
          }}>
            {this.props.name || 'Section'}
          </span>
          <span style={{
            fontSize: 11,
            color: '#6b7280',
          }}>
            Something went wrong.
          </span>
          <button
            onClick={this.handleRetry}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '6px 16px',
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: '#8b5cf6',
              borderRadius: 6,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
