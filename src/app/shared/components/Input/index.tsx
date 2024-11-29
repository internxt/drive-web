import { CheckCircle, Eye, EyeSlash, MagnifyingGlass, Warning, WarningOctagon, X } from '@phosphor-icons/react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';

export default function Input({
  className = '',
  label,
  variant = 'default',
  accent,
  disabled,
  placeholder,
  value,
  maxLength,
  onChange,
  onClear,
  message,
  onFocus,
  onBlur,
  autofocus = false,
  autoComplete = 'on',
  dataTest,
  name,
  required = false,
  labelDataCy,
  inputDataCy,
  onKeyDown,
}: {
  className?: string;
  label?: string;
  variant?: 'default' | 'search' | 'password' | 'email';
  accent?: 'error' | 'warning' | 'success';
  disabled?: boolean;
  placeholder?: string;
  value?: string;
  maxLength?: number;
  onChange?: (v: string) => void;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  message?: string;
  autofocus?: boolean;
  autoComplete?: 'on' | 'off';
  dataTest?: string;
  name?: string;
  required?: boolean;
  labelDataCy?: string;
  inputDataCy?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    if (inputRef && inputRef.current) {
      if (variant !== 'email') {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      }
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (message || autofocus) {
      focusInput();
    }
  }, [message, autofocus, disabled]);

  let focusColor: string;

  switch (accent) {
    case 'error':
      focusColor = 'border-red focus:border-red ring-red';
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

  const placeholderColor = variant === 'search' ? 'placeholder-gray-40' : 'placeholder-gray-30';

  const padding = variant === 'search' ? 'pr-4 pl-10' : 'px-4';

  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const input = (
    <div className="relative">
      <input
        ref={inputRef}
        disabled={disabled}
        className={`inxt-input h-10 w-full rounded-md border bg-transparent text-lg font-normal text-gray-80 outline-none ring-opacity-10 focus:ring-3 disabled:text-gray-40 disabled:placeholder-gray-20 dark:ring-opacity-20 
          ${borderColor} ${focusColor} ${placeholderColor} ${padding}`}
        type={variant === 'password' && !showPassword ? 'password' : variant === 'email' ? 'email' : 'text'}
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
        autoComplete={autoComplete}
        value={value}
        maxLength={maxLength}
        data-test={dataTest}
        data-cy={inputDataCy}
        name={name}
        required={required}
        onKeyDown={onKeyDown ?? undefined}
      />
      {variant === 'password' && isFocused && (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            setShowPassword(!showPassword);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent py-2 pl-2 text-gray-80"
        >
          {showPassword ? <Eye size={24} /> : <EyeSlash size={24} />}
        </div>
      )}
      {variant === 'search' && (
        <MagnifyingGlass
          className={`absolute left-4 top-1/2 -translate-y-1/2 ${disabled ? 'text-gray-20' : 'text-gray-40'}`}
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
          className={`absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer py-2 pl-2 text-gray-40 
            ${isFocused ? 'bg-white' : 'bg-gray-5'}`}
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
      messageColor = 'text-red';
      MessageIcon = WarningOctagon;
      break;
    default:
      messageColor = 'text-gray-80';
  }

  return (
    <div className={`${className}`}>
      {label ? (
        <label>
          <span data-cy={labelDataCy} className={`text-sm ${disabled ? 'text-gray-40' : 'text-gray-80'}`}>
            {label}
          </span>
          {input}
        </label>
      ) : (
        input
      )}
      {maxLength && (
        <p className="font-regular mt-1 text-right text-sm text-gray-50">{`${value?.length ?? 0}/${maxLength}`}</p>
      )}
      {message && (
        <div className={`mt-0.5 flex items-center ${messageColor}`}>
          {MessageIcon && <MessageIcon size={16} weight="fill" />}
          <p className="ml-1 text-sm">{message}</p>
        </div>
      )}
    </div>
  );
}
