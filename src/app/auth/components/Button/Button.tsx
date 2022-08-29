import './Button.scss';

export default function Button({
  text,
  style,
  loading,
  disabled,
  disabledText,
  className,
  leftIcon,
  rightIcon,
}: {
  text: string;
  style: string;
  loading: boolean;
  disabled?: boolean;
  disabledText?: string;
  className?: string;
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
}): JSX.Element {
  return (
    <button
      disabled={disabled}
      type="submit"
      className={`flex h-11 flex-row items-center justify-center space-x-3 whitespace-nowrap ${style} ${className} ${
        loading && 'loading'
      } ${disabled && !loading ? 'disabled' : ''}`}
    >
      {!loading && leftIcon}
      <span>{!disabled ? text : disabledText}</span>
      {!loading && rightIcon}
      <svg
        role="status"
        className={loading ? 'button-loading-spinner' : 'hidden'}
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 0C9.3688 1.63227e-08 10.7147 0.351209 11.909 1.02003C13.1032 1.68886 14.1059 2.65292 14.8211 3.82001C15.5363 4.9871 15.9401 6.31818 15.9938 7.68592C16.0476 9.05366 15.7495 10.4123 15.1281 11.6319C14.5066 12.8515 13.5827 13.8913 12.4446 14.6518C11.3064 15.4122 9.99225 15.8679 8.62767 15.9753C7.2631 16.0827 5.89379 15.8382 4.65072 15.2651C3.40766 14.6921 2.33242 13.8097 1.52787 12.7023L3.1459 11.5267C3.74932 12.3572 4.55575 13.0191 5.48804 13.4489C6.42034 13.8787 7.44732 14.062 8.47076 13.9815C9.49419 13.901 10.4798 13.5592 11.3334 12.9888C12.187 12.4185 12.88 11.6386 13.346 10.7239C13.8121 9.80924 14.0357 8.79025 13.9954 7.76444C13.9551 6.73863 13.6522 5.74033 13.1158 4.86501C12.5794 3.98969 11.8274 3.26664 10.9317 2.76502C10.036 2.26341 9.0266 2 8 2V0Z"
          fill="white"
        />
      </svg>
    </button>
  );
}
