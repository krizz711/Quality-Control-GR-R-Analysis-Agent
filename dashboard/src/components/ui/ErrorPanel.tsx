'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'var(--bg-root)' }}
    >
      <AlertTriangle size={48} style={{ color: 'var(--critical)' }} className="mb-4" />
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <p className="text-sm mb-4 max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: 'white' }}
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
