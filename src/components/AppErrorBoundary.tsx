/**
 * AppErrorBoundary
 *
 * React class-based Error Boundary.
 * Yakalanamamis hatalari yakalar, Sentry'ye raporlar,
 * ErrorBoundaryScreen'i gosterir.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryScreen } from '@/screens/ErrorBoundaryScreen';
import { captureAppError } from '@/services/errorReporting';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | undefined;
}

export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: undefined,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const eventId = captureAppError(error, {
      kind: 'error_boundary',
      extraContext: {
        componentStack: errorInfo.componentStack ?? 'unknown',
      },
    });

    this.setState({ errorId: eventId });

    if (__DEV__) {
      console.error('[AppErrorBoundary]', error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorId: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorBoundaryScreen
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
