'use client';

import type { ReactNode } from 'react';
import ErrorPanel from './ErrorPanel';

/**
 * Renders children only when data is ready.
 * Initial render (server + client hydration) shows the same fallback (skeleton/empty).
 */
export default function AsyncContent<T>({
  isLoading,
  isError,
  errorMessage,
  onRetry,
  data,
  isEmpty,
  emptyFallback,
  loadingFallback,
  errorTitle = 'Failed to load data',
  children,
}: {
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  data: T | undefined;
  isEmpty?: (data: T) => boolean;
  emptyFallback?: ReactNode;
  loadingFallback: ReactNode;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}) {
  if (isError) {
    return (
      <ErrorPanel
        title={errorTitle}
        message={errorMessage || 'An unexpected error occurred.'}
        onRetry={onRetry}
      />
    );
  }

  if (isLoading || data === undefined) {
    return <>{loadingFallback}</>;
  }

  if (isEmpty?.(data)) {
    return <>{emptyFallback ?? null}</>;
  }

  return <>{children(data)}</>;
}
