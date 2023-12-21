import { ReactNode } from 'react';
import Spinner from '../Spinner/Spinner';

export default function Button({
  variant = 'primary',
  type = 'button',
  children,
  className = '',
  disabled = false,
  onClick = () => undefined,
  size = 'default',
  loading,
  dataTest,
  autofocus,
}: {
  variant?: 'primary' | 'accent' | 'secondary' | 'tertiary';
  type?: 'button' | 'submit';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: (unknown) => void;
  size?: 'medium' | 'default';
  loading?: boolean;
  dataTest?: string;
  autofocus?: boolean;
}): JSX.Element {
  let styles = '';

  if (variant === 'primary' && !disabled) {
    styles = `${loading ? 'bg-primary-dark' : 'bg-primary'} active:bg-primary-dark text-white shadow-sm`;
  } else if (variant === 'primary' && disabled) {
    styles = 'bg-gray-30 text-white shadow-sm';
  } else if (variant === 'accent' && !disabled) {
    styles = `${loading ? 'bg-red-dark' : 'bg-red'} active:bg-red-dark text-white shadow-sm`;
  } else if (variant === 'accent' && disabled) {
    styles = 'bg-gray-30 text-white shadow-sm';
  } else if (variant === 'secondary' && !disabled) {
    styles =
      'bg-surface dark:bg-gray-5 border border-gray-10 hover:border-gray-20 active:bg-gray-1 dark:active:bg-gray-10 text-gray-80 shadow-sm';
  } else if (variant === 'secondary' && disabled) {
    styles = 'bg-surface dark:bg-gray-5 text-gray-30 border border-gray-5 shadow-sm';
  } else if (variant === 'tertiary' && !disabled) {
    styles = 'hover:bg-gray-5 active:bg-gray-10 focus-visible:bg-gray-10';
  } else if (variant === 'tertiary' && disabled) {
    styles = 'text-gray-30';
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      data-test={dataTest}
      autoFocus={autofocus}
      className={`${
        size === 'default' ? 'h-10 px-5' : 'h-8 px-3.5'
      } relative flex shrink-0 select-none flex-row items-center justify-center space-x-2 whitespace-nowrap rounded-lg text-base font-medium outline-none ring-2 ring-primary/0 ring-offset-2 ring-offset-transparent transition-all duration-100 ease-in-out focus-visible:ring-primary/50 ${styles} ${className}`}
    >
      {loading && <Spinner size={18} />}
      <div className={`${loading ? 'opacity-0' : ''} flex items-center justify-center space-x-2`}>{children}</div>
    </button>
  );
}
