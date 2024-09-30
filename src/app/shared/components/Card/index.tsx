import { ReactNode } from 'react';

export default function Card({ className = '', children }: { className?: string; children: ReactNode }): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-gray-10 bg-surface p-5 shadow-[0_12px_20px_0_rgba(0,0,0,0.02)] dark:bg-gray-1 ${className}`}
    >
      {children}
    </div>
  );
}
