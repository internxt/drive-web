interface ButtonProps {
  className?: string;
  children: JSX.Element | JSX.Element[] | string;
  disabled?: boolean;
  onClick?: () => void;
}

const BaseButton = ({ className, children, disabled, onClick }: ButtonProps): JSX.Element => {
  return (
    <button
      className={`base-button flex items-center justify-center rounded-lg py-1.5 text-base transition-all duration-75 ease-in-out ${
        className || ''
      }`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default BaseButton;
