import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Top-level React Error Boundary protecting the DesignDNA workspace against
 * unexpected runtime render exceptions with a clean recovery path.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.'
    };
  }

  public override componentDidCatch(error: Error): void {
    console.error('DesignDNA render error boundary caught exception:', error.message);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center p-6">
        <div
          role="alert"
          className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-5"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-danger shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5 min-w-0">
              <h1 className="text-lg font-semibold text-ink">Workspace encountered an error</h1>
              <p className="text-sm text-muted leading-relaxed">
                DesignDNA caught an unexpected interface error. Your screenshots are stored only in
                session memory and were not persisted.
              </p>
            </div>
          </div>

          {this.state.errorMessage && (
            <div className="rounded-lg border border-border bg-canvas/80 px-3.5 py-2.5 text-xs font-mono text-muted break-words">
              {this.state.errorMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent-hover transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Recover Workspace</span>
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-strong bg-elevated px-4 py-2 text-sm font-medium text-ink hover:border-accent/50 transition-colors cursor-pointer"
            >
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
