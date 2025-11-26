import { ReactNode } from 'react';

interface CardProps {
  className?: string;
  children: ReactNode;
}
export default function Card({ className = '', children }: Readonly<CardProps>): JSX.Element {
  return (
    <div
      className={`rounded-xl border border-gray-10 bg-surface p-5 shadow-[0_12px_20px_0_rgba(0,0,0,0.02)] dark:bg-gray-1 ${className}`}
    >
      {children}
    </div>
  );
}
