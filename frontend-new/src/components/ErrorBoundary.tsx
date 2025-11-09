import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });

    // Report to Sentry if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const details = `
Error: ${error?.message || 'Unknown error'}

Stack trace:
${error?.stack || 'No stack trace available'}

Component stack:
${errorInfo?.componentStack || 'No component stack available'}

Location: ${window.location.href}
User agent: ${navigator.userAgent}
Time: ${new Date().toISOString()}
    `.trim();

    navigator.clipboard.writeText(details).then(
      () => alert('Error details copied to clipboard'),
      () => alert('Failed to copy error details')
    );
  };

  handleTryAgain = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDetails: false,
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, showDetails } = this.state;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleTryAgain}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Go to Home
              </button>

              <button
                onClick={() => this.setState({ showDetails: !showDetails })}
                className="w-full text-gray-600 px-4 py-2 text-sm hover:text-gray-800 transition-colors"
              >
                {showDetails ? 'Hide' : 'Show'} technical details
              </button>
            </div>

            {showDetails && error && (
              <div className="mt-4 border-t pt-4">
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Error Message</h3>
                  <p className="text-sm text-gray-800 font-mono break-words">
                    {error.message || 'Unknown error'}
                  </p>
                </div>

                {error.stack && (
                  <details className="mb-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-40 font-mono">
                      {error.stack}
                    </pre>
                  </details>
                )}

                <button
                  onClick={this.handleCopyDetails}
                  className="w-full text-sm text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-600 rounded-lg transition-colors"
                >
                  Copy Error Details
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

