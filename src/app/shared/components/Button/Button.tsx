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
}: {
  variant?: 'primary' | 'accent' | 'secondary';
  type?: 'button' | 'submit';
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  size?: 'medium' | 'default';
  loading?: boolean;
}): JSX.Element {
  let styles = '';

  if (variant === 'primary' && !disabled) {
    styles = `${loading ? 'bg-primary-dark' : 'bg-primary'} active:bg-primary-dark text-white`;
  } else if (variant === 'primary' && disabled) {
    styles = 'bg-gray-30 text-white';
  } else if (variant === 'accent' && !disabled) {
    styles = `${loading ? 'bg-red-dark' : 'bg-red-std'} active:bg-red-dark text-white`;
  } else if (variant === 'accent' && disabled) {
    styles = 'bg-gray-30 text-white';
  } else if (variant === 'secondary' && !disabled) {
    styles = `${loading ? 'bg-gray-20' : 'bg-gray-5'} hover:bg-gray-10 active:bg-gray-20 text-gray-80`;
  } else if (variant === 'secondary' && disabled) {
    styles = 'bg-gray-5 text-gray-30';
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      className={`${
        size === 'default' ? 'h-10 px-5' : 'h-8 px-3.5'
      } outline-none relative select-none rounded-lg text-base font-medium ${styles} ${className}`}
    >
      {loading && (
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform">
          <Spinner />
        </div>
      )}
      <div className={loading ? 'opacity-0' : ''}>{children}</div>
    </button>
  );
}
