import { CaretLeft } from '@phosphor-icons/react';
import { ReactNode } from 'react';

export default function Section({
  className = '',
  children,
  title,
  onBackButtonClicked,
}: {
  className?: string;
  children: ReactNode;
  title: string;
  onBackButtonClicked?: () => void;
}): JSX.Element {
  return (
    <div className={`${className} space-y-2`}>
      <div className="flex flex-row space-x-4 ">
        {onBackButtonClicked && (
          <button onClick={onBackButtonClicked}>
            <div className="text-gray-100">
              <CaretLeft size={22} />
            </div>
          </button>
        )}
        <span className="text-lg font-medium text-gray-100">{title}</span>
      </div>
      {children}
    </div>
  );
}
