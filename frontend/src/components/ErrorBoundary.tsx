import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-blue-900/10 border border-slate-100 p-8 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-slate-900 mb-2 tracking-tight uppercase">Something went wrong</h1>
            <p className="text-slate-500 font-medium mb-8">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {this.state.error && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl text-left overflow-auto max-h-32 border border-slate-100">
                <code className="text-xs text-slate-400 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white py-4 px-6 rounded-2xl font-display font-bold text-xs uppercase tracking-wide transition-all shadow-xl shadow-primary/25 active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Loading
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 py-4 px-6 rounded-2xl font-display font-bold text-xs uppercase tracking-wide transition-all border border-slate-200 active:scale-95"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
