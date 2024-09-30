import { FunctionComponent, SVGProps } from 'react';

interface TaskLoggerButtonProps {
  onClick: () => void;
  Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  className?: string;
}

export const TaskLoggerButton = ({ onClick, Icon, className }: TaskLoggerButtonProps) => {
  return (
    <button
      onClick={onClick}
      onKeyDown={() => {}}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-gray-10 bg-white shadow-sm dark:border-gray-30 dark:bg-gray-20 ${className}`}
    >
      <Icon height={20} width={20} className="text-gray-100" />
    </button>
  );
};
