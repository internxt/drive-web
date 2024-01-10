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
    <div className={`${className} space-y-2`}>
      <span className="text-lg font-medium text-gray-100">{title}</span>
      {children}
    </div>
  );
}
