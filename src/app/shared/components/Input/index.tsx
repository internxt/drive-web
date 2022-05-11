import { Eye, EyeSlash, MagnifyingGlass, X, WarningOctagon, Warning, CheckCircle } from 'phosphor-react';
import { useState } from 'react';

export default function Input({
  className = '',
  label,
  variant = 'default',
  accent,
  disabled,
  placeholder,
  value,
  onChange,
  onClear,
  message,
  onFocus,
  onBlur,
}: {
  className?: string;
  label?: string;
  variant?: 'default' | 'search' | 'password';
  accent?: 'error' | 'warning' | 'success';
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (v: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  message?: string;
}): JSX.Element {
  let focusColor: string;

  switch (accent) {
    case 'error':
      focusColor = 'focus:border-red-std ring-red-std';
      break;
    case 'warning':
      focusColor = 'focus:border-orange ring-orange';
      break;
    case 'success':
      focusColor = 'focus:border-green ring-green';
      break;
    default:
      focusColor = 'focus:border-primary ring-primary';
      break;
  }

  const borderColor =
    variant === 'search' ? 'border-transparent' : 'border-gray-20 disabled:border-gray-10 hover:border-gray-30';

  const backgroundColor =
    variant === 'search' ? 'bg-gray-5 focus:bg-white disabled:bg-gray-5' : 'bg-white disabled:bg-white';

  const placeholderColor = variant === 'search' ? 'placeholder-gray-40' : 'placeholder-gray-30';

  const textWeight = variant === 'search' ? 'font-normal' : 'font-medium';

  const padding = variant === 'search' ? 'pr-4 pl-10' : 'px-4';

  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const input = (
    <div className="relative">
      <input
        disabled={disabled}
        className={`inxt-input outline-none h-11 w-full rounded-md border text-lg text-gray-80 ring-opacity-10 focus:ring-2 disabled:text-gray-40 disabled:placeholder-gray-20 
				${borderColor} ${focusColor} ${placeholderColor} ${backgroundColor} ${textWeight} ${padding}`}
        type={variant === 'password' && !showPassword ? 'password' : 'text'}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => {
          if (onFocus) onFocus();
          setIsFocused(true);
        }}
        onBlur={() => {
          if (onBlur) onBlur();
          setIsFocused(false);
        }}
        value={value}
      />
      {variant === 'password' && isFocused && (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowPassword(!showPassword);
          }}
          className={`absolute top-1/2 right-4 -translate-y-1/2 transform cursor-pointer py-2 pl-2 text-gray-80 ${backgroundColor}`}
        >
          {showPassword ? <Eye size={24} /> : <EyeSlash size={24} />}
        </div>
      )}
      {variant === 'search' && (
        <MagnifyingGlass
          className={`absolute top-1/2 left-4 -translate-y-1/2 transform ${disabled ? 'text-gray-20' : 'text-gray-40'}`}
          size={20}
        />
      )}
      {variant === 'search' && value && !disabled && (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            if (onClear) onClear();
          }}
          className={`absolute top-1/2 right-4 -translate-y-1/2 transform cursor-pointer py-2 pl-2 text-gray-40  ${
            isFocused ? 'bg-white' : 'bg-gray-5'
          }`}
        >
          <X size={20} />
        </div>
      )}
    </div>
  );

  let messageColor: string;
  let MessageIcon: typeof WarningOctagon | undefined;

  switch (accent) {
    case 'success':
      messageColor = 'text-green';
      MessageIcon = CheckCircle;
      break;
    case 'warning':
      messageColor = 'text-orange';
      MessageIcon = Warning;
      break;
    case 'error':
      messageColor = 'text-red-std';
      MessageIcon = WarningOctagon;
      break;
    default:
      messageColor = 'text-gray-80';
  }

  return (
    <div className={`${className}`}>
      {label ? (
        <label className={`text-sm ${disabled ? 'text-gray-40' : 'text-gray-80'}`}>
          {label} {input}
        </label>
      ) : (
        input
      )}
      {message && (
        <div className={`mt-0.5 flex items-center ${messageColor}`}>
          {MessageIcon && <MessageIcon size={16} />}
          <p className="ml-1 text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
