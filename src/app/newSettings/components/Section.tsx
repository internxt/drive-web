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
      <div className="fixed absolute z-50 flex w-full items-center justify-between rounded-tr-2xl bg-surface/85 p-2.5 pl-6 backdrop-blur-3xl">
        <div className="flex">
          {onBackButtonClicked && (
            <button onClick={onBackButtonClicked}>
              <div className="mr-2.5 text-gray-100">
                <CaretLeft size={22} />
              </div>
            </button>
          )}
          <h2 className="text-base font-medium text-gray-100">{title}</h2>
        </div>
        <button
          className="rounded-md p-2 hover:bg-highlight/4 focus:bg-highlight/8"
          onClick={() => onClosePreferences()}
        >
          <X size={22} />
        </button>
      </div>
      <div className="flex max-h-640 flex-col space-y-6 overflow-y-auto p-6 pt-16">{children}</div>
    </div>
  );
};

export default Section;
