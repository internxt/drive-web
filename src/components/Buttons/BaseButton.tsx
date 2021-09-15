interface ButtonProps {
  className?: string;
  children: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  onClick?: () => void;
}

const BaseButton = ({ className, children, disabled, onClick }: ButtonProps): JSX.Element => {
  return (
    <button
      className={`base-button flex items-center justify-center py-3 rounded text-base ${className || ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default BaseButton;
