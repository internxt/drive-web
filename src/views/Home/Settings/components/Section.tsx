import { ReactNode } from 'react';
import { CaretLeft, X } from '@phosphor-icons/react';

const Section = ({
  className = '',
  children,
  title,
  onBackButtonClicked,
  onClosePreferences,
}: {
  className?: string;
  children: ReactNode;
  title: string;
  onBackButtonClicked?: () => void;
  onClosePreferences: () => void;
}): JSX.Element => {
  return (
    <div className={`relative w-full rounded-tr-2xl ${className}`}>
      <div className="absolute z-50 flex w-full items-center justify-between rounded-tr-2xl p-2.5 pl-6 before:absolute before:inset-0 before:-z-1 before:bg-surface/85 before:backdrop-blur-3xl before:transition-colors">
        <div className="flex items-center">
          {onBackButtonClicked && (
            <button onClick={onBackButtonClicked}>
              <div className="mr-2.5 flex h-9 w-9 items-center justify-center rounded-lg text-gray-100 hover:bg-highlight/4 active:bg-highlight/8">
                <CaretLeft size={22} />
              </div>
            </button>
          )}
          <h2 className="text-base font-medium text-gray-100">{title}</h2>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-highlight/4 active:bg-highlight/8"
          onClick={() => onClosePreferences()}
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex max-h-640 flex-col space-y-8 overflow-y-auto p-6 pt-16">{children}</div>
    </div>
  );
};

export default Section;
