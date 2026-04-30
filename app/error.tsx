'use client';
import { useEffect } from 'react';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: Props) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px',
        color: 'var(--fg)',
      }}
    >
      <h2 style={{ color: 'var(--error)' }}>오류가 발생했습니다</h2>
      <p style={{ color: 'var(--muted)' }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: 'var(--accent)',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        다시 시도
      </button>
    </div>
  );
}
