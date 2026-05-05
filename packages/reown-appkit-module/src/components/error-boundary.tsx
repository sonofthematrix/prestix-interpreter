import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error }> | React.ReactNode;
  componentName?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const componentName = this.props.componentName || 'ErrorBoundary';
    console.error(`${componentName} caught an error:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // If fallback is a ReactNode (JSX element), render it directly
      if (React.isValidElement(this.props.fallback) || 
          (typeof this.props.fallback !== 'function' && this.props.fallback !== undefined)) {
        return this.props.fallback as React.ReactNode;
      }
      
      // If fallback is a component, render it with error prop
      const FallbackComponent = this.props.fallback as React.ComponentType<{ error?: Error }> | undefined;
      if (FallbackComponent) {
      return <FallbackComponent error={this.state.error} />;
      }
      
      // Default fallback
      return <DefaultErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      {error && (
        <details className="mt-2">
          <summary className="cursor-pointer text-red-700">Error details</summary>
          <pre className="mt-2 text-sm text-red-600 whitespace-pre-wrap">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

// Additional error boundary components
export const HeaderErrorBoundary = ErrorBoundary;
export const SidebarErrorBoundary = ErrorBoundary;
export const LayoutErrorBoundary = ErrorBoundary;
