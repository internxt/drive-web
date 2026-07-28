import { FunctionComponent, SVGProps } from 'react';

interface TaskLoggerButtonProps {
  onClick: () => void;
  Icon: FunctionComponent<SVGProps<SVGSVGElement>>;
  className?: string;
  sizeClassName?: string;
  iconSize?: number;
}

export const TaskLoggerButton = ({
  onClick,
  Icon,
  className,
  sizeClassName = 'h-8 w-8',
  iconSize = 20,
}: TaskLoggerButtonProps) => {
  return (
    <button
      data-testid="task-logger-button"
      onClick={onClick}
      onKeyDown={() => {}}
      className={`flex ${sizeClassName} cursor-pointer items-center justify-center rounded-lg border border-gray-10 bg-white shadow-sm dark:border-gray-30 dark:bg-gray-20 ${className}`}
    >
      <Icon height={iconSize} width={iconSize} className="text-gray-100" />
    </button>
  );
};
