import { ReactNode } from 'react';

export default function Section({
  className = '',
  children,
  title,
}: {
  className?: string;
  children: ReactNode;
  title: string;
}): JSX.Element {
  return (
    <div className={`${className}`}>
      <h1 className="mb-3 text-lg font-medium text-gray-80">{title}</h1>
      {children}
    </div>
  );
}
