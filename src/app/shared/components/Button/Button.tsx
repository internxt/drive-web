import { ReactNode } from 'react';

export default function Button({
  variant = 'primary',
  children,
  className = '',
  disabled = false,
  onClick = () => undefined,
  size = 'default',
}: {
  variant?: 'primary' | 'accent' | 'secondary';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'medium' | 'default';
}): JSX.Element {
  let styles = '';

  if (variant === 'primary' && !disabled) {
    styles = 'bg-primary active:bg-primary-dark text-white';
  } else if (variant === 'primary' && disabled) {
    styles = 'bg-gray-30 text-white';
  } else if (variant === 'accent' && !disabled) {
    styles = 'bg-red-std active:bg-red-dark text-white';
  } else if (variant === 'accent' && disabled) {
    styles = 'bg-gray-30 text-white';
  } else if (variant === 'secondary' && !disabled) {
    styles = 'bg-gray-5 hover:bg-gray-10 active:bg-gray-20 text-gray-80';
  } else if (variant === 'secondary' && disabled) {
    styles = 'bg-gray-5 text-gray-30';
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`${
        size === 'default' ? 'h-10 px-5' : 'h-8 px-3.5'
      } select-none rounded-lg text-base font-medium ${styles} ${className}`}
    >
      {children}
      <div className=""></div>
    </button>
  );
}
